import { getOwner } from "@ember/owner";
import { module, test } from "qunit";
import sinon from "sinon";
import cookie, { removeCookie } from "discourse/lib/cookie";
import { setupApplicationTest } from "discourse/tests/helpers";
import autoLoginInitializer from "discourse/plugins/discourse-auto-login/discourse/initializers/auto-login";

const NO_AUTO_LOGIN_COOKIE = "no_auto_login";

// site-fixtures.js already provides auth_providers fixture of just facebook

module("Auto Login | Unit | auto login initialization", function (hooks) {
  setupApplicationTest(hooks);

  hooks.beforeEach(function () {
    this.siteSettings = getOwner(this).lookup("service:site-settings");
    this.siteSettings.auto_login_enabled = true;
    this.siteSettings.enable_local_logins = false;
  });

  hooks.afterEach(function () {
    removeCookie(NO_AUTO_LOGIN_COOKIE);
  });

  test("attempts auto login when no user and no cookie", async function (assert) {
    let called = false;
    let args = null;
    const loginService = getOwner(this).lookup("service:login");
    sinon.stub(loginService, "externalLoginMethods").get(() => [
      {
        name: "external",
        doLogin(...rest) {
          called = true;
          args = rest;
        },
      },
    ]);
    sinon.stub(loginService, "isOnlyOneExternalLoginMethod").get(() => true);
    removeCookie(NO_AUTO_LOGIN_COOKIE);

    autoLoginInitializer.initialize(getOwner(this));

    assert.true(
      called,
      "Auto login should be attempted when no user and no cookie"
    );
    assert.deepEqual(
      args,
      [{ signup: false, params: { silent: true } }],
      "doLogin is called with correct arguments for silent login"
    );
  });

  test("does not auto login if no single external login method", async function (assert) {
    let called = false;
    const loginService = getOwner(this).lookup("service:login");
    sinon.stub(loginService, "externalLoginMethods").get(() => [
      {
        name: "external",
        doLogin() {
          called = true;
        },
      },
      {
        name: "external2",
        doLogin() {
          called = true;
        },
      },
    ]);
    sinon.stub(loginService, "isOnlyOneExternalLoginMethod").get(() => false);
    removeCookie(NO_AUTO_LOGIN_COOKIE);

    autoLoginInitializer.initialize(getOwner(this));

    assert.false(
      called,
      "Auto login should not be attempted when multiple external login methods"
    );
  });

  test("does not auto login if local logins enabled", async function (assert) {
    this.siteSettings.enable_local_logins = true;

    let called = false;
    const loginService = getOwner(this).lookup("service:login");
    sinon.stub(loginService, "externalLoginMethods").get(() => [
      {
        name: "external",
        doLogin() {
          called = true;
        },
      },
    ]);
    removeCookie(NO_AUTO_LOGIN_COOKIE);

    autoLoginInitializer.initialize(getOwner(this));

    assert.false(
      called,
      "Auto login should not be attempted when local logins are enabled"
    );
  });

  test("does not auto login if no_auto_login cookie present", async function (assert) {
    cookie(NO_AUTO_LOGIN_COOKIE, "1");

    let called = false;
    const loginService = getOwner(this).lookup("service:login");
    sinon.stub(loginService, "externalLoginMethods").get(() => [
      {
        name: "external",
        doLogin() {
          called = true;
        },
      },
    ]);
    sinon.stub(loginService, "isOnlyOneExternalLoginMethod").get(() => true);

    autoLoginInitializer.initialize(getOwner(this));

    assert.false(
      called,
      "Auto login should not be attempted when no_auto_login cookie present"
    );
  });
});
