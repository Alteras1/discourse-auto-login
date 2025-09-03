# frozen_string_literal: true

# name: discourse-auto-login
# about: TODO
# meta_topic_id: TODO
# version: 0.0.1
# authors: Alteras1
# url: TODO
# required_version: 2.7.0

enabled_site_setting :auto_login_enabled

module ::AutoLoginModule
  PLUGIN_NAME = "discourse-auto-login"
end

require_relative "lib/auto_login_module/engine"

after_initialize do
  # Code which should run after Rails has finished booting

  OmniAuth.config.before_request_phase do |env|
    if !SiteSetting.auto_login_enabled
      next
    end

    request = ActionDispatch::Request.new(env)
    if request.params.key?("silent") && request.params["silent"] == "true"
      if env['omniauth.strategy'].is_a? OmniAuth::Strategies::OAuth2
        env['omniauth.strategy'].options[:prompt] = 'none'
      else
        # Assume SAML
        # There is a separate plugin for omniauth SAML that we can't guarantee is installed
        env['omniauth.strategy'].options[:passive] = 'true'
      end
    end
  end
end
