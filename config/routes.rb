# frozen_string_literal: true

AutoLoginModule::Engine.routes.draw do
  get "/examples" => "examples#index"
  # define routes here
end

Discourse::Application.routes.draw { mount ::AutoLoginModule::Engine, at: "my-plugin" }
