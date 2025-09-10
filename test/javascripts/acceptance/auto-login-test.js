import { getOwner } from "@ember/owner";
import { visit } from "@ember/test-helpers";
import { test } from "qunit";
import sinon from "sinon";
import { removeCookie } from "discourse/lib/cookie";
import { acceptance } from "discourse/tests/helpers/qunit-helpers";

const NO_AUTO_LOGIN_COOKIE = "no_auto_login";

// site-fixtures.js already provides auth_providers fixture of just facebook

acceptance("Auto Login - auto login initialization", function (needs) {
  needs.settings({
    auto_login_enabled: true,
    enable_local_logins: false,
  });
  needs.user({ username: "eviltrout", id: 20 });

  test("does not auto login if current user is present", async function (assert) {
    const loginService = getOwner(this).lookup("service:login");
    let called = false;
    sinon.stub(loginService, "externalLoginMethods").get(() => [
      {
        name: "external",
        doLogin() {
          called = true;
        },
      },
    ]);
    sinon.stub(loginService, "isOnlyOneExternalLoginMethod").get(() => true);
    removeCookie(NO_AUTO_LOGIN_COOKIE);

    await visit("/u/eviltrout");
    assert.false(
      called,
      "Auto login should not be attempted when current user is present"
    );
  });
});
