import { visit } from "@ember/test-helpers";
import { test } from "qunit";
import cookie, { removeCookie } from "discourse/lib/cookie";
import {
  acceptance,
  publishToMessageBus,
} from "discourse/tests/helpers/qunit-helpers";

acceptance("Auto Login - Forced Logout Cleanup", function (needs) {
  needs.user({ username: "eviltrout", id: 19 });
  needs.settings({
    auto_login_enabled: true,
    auto_login_days_cooldown_after_logout: 365,
  });

  test("It sets no_auto_login cookie on forced logout", async function (assert) {
    removeCookie("no_auto_login");

    await visit("/u/eviltrout");
    await publishToMessageBus("/logout/19");

    assert.dom(".dialog-body").exists("core behavior shows logout dialog");

    assert.strictEqual(
      cookie("no_auto_login"),
      "1",
      "no_auto_login cookie is set"
    );

    // Cleanup
    removeCookie("no_auto_login");
  });
});
