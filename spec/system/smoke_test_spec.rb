# frozen_string_literal: true

describe "Auto Login | smoke test", type: :system do
  fab!(:admin)

  before do
    SiteSetting.auto_login_enabled = true
    sign_in(admin)
  end

  it "plugin settings are navigable" do
    visit("/admin/plugins/discourse-auto-login")

    expect(page).to have_css("[data-setting=auto_login_enabled]")
    expect(find("[data-setting=auto_login_enabled] input[type=checkbox]").checked?).to be true
    expect(page).to have_css("[data-setting=auto_login_strategy]")
    expect(page).to have_css("[data-setting=auto_login_days_cooldown_after_logout]")
  end
end