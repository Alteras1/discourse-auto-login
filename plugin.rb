# frozen_string_literal: true

# name: discourse-auto-login
# about: Automatically log users in via SSO if they have an active session at the provider
# meta_topic_id: TODO
# version: 1.0.1
# authors: Alteras1
# url: https://github.com/Alteras1/discourse-auto-login
# required_version: 2.7.0

enabled_site_setting :auto_login_enabled

register_asset "stylesheets/common/index.scss"

module ::AutoLogin
  PLUGIN_NAME = "discourse-auto-login"

  # see https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest
  # immediate_failed is not in the spec but is used by some providers (i.e. Google)
  OAUTH_PROMPT_NONE_ERRORS = %w[interaction_required login_required account_selection_required consent_required immediate_failed].freeze

  def self.saml_enabled?
    defined?(OmniAuth::Strategies::SAML) && SiteSetting.saml_enabled
  end
end

after_initialize do
  existing_omniauth_before_request_phase = OmniAuth.config.before_request_phase
  OmniAuth.config.before_request_phase do |env|
    existing_omniauth_before_request_phase.call(env) if existing_omniauth_before_request_phase
    if !SiteSetting.auto_login_enabled
      next
    end

    request = ActionDispatch::Request.new(env)
    if request.params.key?("silent") && request.params["silent"] == "true"
      if env["omniauth.strategy"].is_a? OmniAuth::Strategies::OAuth2
        env["omniauth.strategy"].options[:prompt] = "none"
      elsif ::AutoLogin.saml_enabled? && env["omniauth.strategy"].is_a?(OmniAuth::Strategies::SAML)
        # There is a separate plugin for omniauth SAML that we can't guarantee is installed
        env["omniauth.strategy"].options[:passive] = "true"
      end
    end
  end

  # NOTE: by default omniauth will raise an exception in development mode
  # To force redirect to /auth/failure even in development mode, set failure_raise_out_environments to []
  # See discourse/config/initializers/009-omniauth.rb#L11

  class ::AutoLogin::SilentLoginError < StandardError
  end

  existing_omniauth_on_failure = OmniAuth.config.on_failure
  OmniAuth.config.on_failure do |env|
    if !SiteSetting.auto_login_enabled
      next existing_omniauth_on_failure.call(env) if existing_omniauth_on_failure
    end

    if env["omniauth.strategy"].is_a? OmniAuth::Strategies::OAuth2
      if ::AutoLogin::OAUTH_PROMPT_NONE_ERRORS.include?(env["omniauth.error.type"].to_s)
        env["omniauth.error.type"] = "silent_login_failed"
        env["omniauth.error"] = ::AutoLogin::SilentLoginError.new("silent_login_failed")
        next OmniAuth::FailureEndpoint.new(env).redirect_to_failure
      end
    elsif ::AutoLogin.saml_enabled? && env["omniauth.strategy"].is_a?(OmniAuth::Strategies::SAML)
      # NoPassive is part of SAML2.0 spec
      # https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-samlpr/96b92662-9bf7-4910-ab16-e1c28bce962b
      if env["omniauth.error"].message.include? "NoPassive"
        env["omniauth.error.type"] = "silent_login_failed"
        env["omniauth.error"] = ::AutoLogin::SilentLoginError.new("silent_login_failed")
        next OmniAuth::FailureEndpoint.new(env).redirect_to_failure
      end
    end

    existing_omniauth_on_failure.call(env) if existing_omniauth_on_failure
  end

  module ::AutoLogin::OmniauthCallbacksControllerExtensions
    def failure
      if params[:message] == "silent_login_failed"
        preferred_origin = request.env["omniauth.origin"]

        if session[:destination_url].present?
          preferred_origin = session[:destination_url]
          session.delete(:destination_url)
        elsif cookies[:destination_url].present?
          preferred_origin = cookies[:destination_url]
          cookies.delete(:destination_url)
        end

        origin = Discourse.base_path("/")

        if preferred_origin.present?
          parsed =
            begin
              URI.parse(preferred_origin)
            rescue URI::Error
            end

          if valid_origin?(parsed)
            origin = "#{parsed.path}"
            origin << "?#{parsed.query}" if parsed.query
          end
        end

        cookies[:no_auto_login] = { value: "1" }

        return redirect_to origin
      end
      super
    end
  end
  ::Users::OmniauthCallbacksController.prepend(::AutoLogin::OmniauthCallbacksControllerExtensions)

  module ::AutoLogin::SessionControllerExtensions
    def destroy
      # When the user manually logs out, disable auto-login for them for a year.
      # Assumes the user intended to stay logged out.
      # If they log back in manually, the cookie is cleared by JS.
      if SiteSetting.auto_login_enabled
        cookies[:no_auto_login] = { value: "1", expires: SiteSetting.auto_login_days_cooldown_after_logout.days.from_now }
      end
      super
    end
  end
  ::SessionController.prepend(::AutoLogin::SessionControllerExtensions)
end
