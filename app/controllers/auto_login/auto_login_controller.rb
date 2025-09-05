# frozen_string_literal: true

module ::AutoLogin
  class AutoLoginController < ::ApplicationController
    requires_plugin PLUGIN_NAME

    layout "no_ember"

    def redirect_to_provider
      # TODO: see omniauth_callbacks_controller for better guards
      # 
      p "redirect route"
      Discourse.enabled_authenticators.first
      render locals: { hide_auth_buttons: true }
    end
  end
end
