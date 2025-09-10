# frozen_string_literal: true

AutoLogin::Engine.routes.draw do
  # get "/redirect" => "auto_login#redirect_to_provider"
  # define routes here
end

Discourse::Application.routes.draw { mount ::AutoLogin::Engine, at: "auto-login" }
