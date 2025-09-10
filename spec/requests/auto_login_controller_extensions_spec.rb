# frozen_string_literal: true

require "rails_helper"

describe "Auto Login controller extensions of OmniauthCallbacksController", type: :request do
  before do
    SiteSetting.auto_login_enabled = true
    SiteSetting.login_required = true
    Jobs.run_immediately!
  end

  after do
    Rails.application.env_config["omniauth.auth"] = OmniAuth.config.mock_auth[:google_oauth2] = nil
    Rails.application.env_config["omniauth.origin"] = nil
  end

  describe "requests with OAuth2" do
    before do
      SiteSetting.enable_google_oauth2_logins = true
      SiteSetting.auto_login_enabled = true
    end
    after { SiteSetting.enable_google_oauth2_logins = false }

    it "should not attach prompt=none if auto_login_enabled is false" do
      SiteSetting.auto_login_enabled = false

      post "/auth/google_oauth2", params: { silent: "true" }
      expect(response.status).to eq(302)
      expect(response.location).not_to include("prompt=none")

      post "/auth/google_oauth2"
      expect(response.status).to eq(302)
      expect(response.location).not_to include("prompt=none")
    end

    it "should attach prompt=none if silent=true and auto_login_enabled is true" do
      post "/auth/google_oauth2?silent=true", params: { silent: "true" }
      expect(response.status).to eq(302)
      expect(response.location).to include("prompt=none")
    end
  end

  describe "requests with SAML" do
    before do
      SiteSetting.saml_enabled = true
      SiteSetting.auto_login_enabled = true
      OmniAuth.config.test_mode = false
      SiteSetting.saml_target_url = "https://example.com/samlidp"
    end
    after { SiteSetting.saml_enabled = false }

    it "should not attach IsPassive=true if auto_login_enabled is false" do
      SiteSetting.auto_login_enabled = false
      SiteSetting.saml_request_method = "POST"

      post "/auth/saml", params: { silent: "true" }
      expect(response.status).to eq(200)
      html = Nokogiri.HTML5(response.body)
      expect(Base64.decode64(html.at("input").attribute("value").value)).not_to include("IsPassive='true'")

      post "/auth/saml"
      expect(response.status).to eq(200)
      html = Nokogiri.HTML5(response.body)
      expect(Base64.decode64(html.at("input").attribute("value").value)).not_to include("IsPassive='true'")
    end

    it "should attach IsPassive=true if silent=true and auto_login_enabled is true" do
      SiteSetting.saml_request_method = "POST"

      post "/auth/saml?silent=true", params: { silent: "true" }
      expect(response.status).to eq(200)
      html = Nokogiri.HTML5(response.body)
      expect(Base64.decode64(html.at("input").attribute("value").value)).to include("IsPassive='true'")
    end
  end

  describe "handles silent login OAuth2 failures" do
    before do
      SiteSetting.enable_google_oauth2_logins = true
      SiteSetting.auto_login_enabled = true
      OmniAuth.config.test_mode = true
    end

    after do
      SiteSetting.enable_google_oauth2_logins = false
      OmniAuth.config.test_mode = false
    end


    ::AutoLogin::OAUTH_PROMPT_NONE_ERRORS.each do |error|
      it "should handle #{error} error " do
        SiteSetting.auto_login_enabled = true
        OmniAuth.config.mock_auth[:google_oauth2] = error.to_sym

        post "/auth/google_oauth2", params: { silent: "true" }
        follow_redirect!
        expect(response.status).to eq(302)
        expect(response.location).to include("/auth/failure?message=silent_login_failed")
      end
    end

    it "should clean up cookies after silent login failure" do
      SiteSetting.auto_login_enabled = true
      OmniAuth.config.mock_auth[:google_oauth2] = :login_required

      # Set destination_url in session
      get "/"
      expect(response.status).to eq(200)
      cookies[:destination_url] = "/"

      post "/auth/google_oauth2", params: { silent: "true" }
      follow_redirect!
      expect(response.status).to eq(302)
      expect(response.location).to include("/auth/failure?message=silent_login_failed")

      follow_redirect!
      expect(response.status).to eq(302)
      expect(response.location).to end_with("/")

      follow_redirect!
      expect(response.status).to eq(200)
      expect(cookies[:no_auto_login]).to eq("1")
    end
  end
end
