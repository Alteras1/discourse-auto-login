import { setOwner } from "@ember/owner";
import { service } from "@ember/service";
import cookie from "discourse/lib/cookie";
import { bind } from "discourse/lib/decorators";

const NO_AUTO_LOGIN_COOKIE = "no_auto_login";

/**
 * Class to handle cleanup tasks on forced logout. Will add a `no_auto_login` cookie to
 * prevent auto-login from firing again after forced logout.
 *
 * If a user is logged out via Admin, there's probably a good reason for it, so we shouldn't
 * automatically log them back in. Sets no_auto_login cookie to wait 1 year before
 * attempting auto-login again.
 *
 * This is a separate initializer to the main logout handler to ensure that the
 * logout logic can subscribe to the message bus before this logic runs.
 * @see discourse/app/assets/javascripts/discourse/app/instance-initializers/logout.js
 */
class ForcedLogoutCleanup {
  @service messageBus;
  @service currentUser;
  @service siteSettings;

  constructor(owner) {
    setOwner(this, owner);
    if (this.currentUser) {
      this.messageBus.subscribe(
        `/logout/${this.currentUser.id}`,
        this.preventAutoLogin
      );
    }
  }

  teardown() {
    if (this.currentUser) {
      this.messageBus.unsubscribe(
        `/logout/${this.currentUser.id}`,
        this.preventAutoLogin
      );
    }
  }

  @bind
  preventAutoLogin() {
    if (!this.siteSettings.auto_login_enabled) {
      return;
    }
    cookie(NO_AUTO_LOGIN_COOKIE, "1", {
      expires: moment()
        .add(this.siteSettings.auto_login_days_cooldown_after_logout, "d")
        .toDate(),
    });
  }
}

export default {
  name: "forced-logout-cleanup",
  after: "logout",
  initialize(owner) {
    // native class model to be able to preserve message bus subscriptions
    this.instance = new ForcedLogoutCleanup(owner);
  },
  teardown() {
    this.instance.teardown();
    this.instance = null;
  },
};
