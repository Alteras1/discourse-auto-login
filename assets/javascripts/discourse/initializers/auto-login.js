import cookie, { removeCookie } from "discourse/lib/cookie";
import { withPluginApi } from "discourse/lib/plugin-api";
import DiscourseURL from "discourse/lib/url";
import { isValidDestinationUrl } from "discourse/lib/utilities";

const NO_AUTO_LOGIN_COOKIE = "no_auto_login";

function autoLoginIfNeeded(api) {
  const currentUser = api.getCurrentUser();
  if (currentUser) {
    removeCookie(NO_AUTO_LOGIN_COOKIE);
    return;
  }

  if (cookie(NO_AUTO_LOGIN_COOKIE)) {
    return;
  }

  const { isAppWebview } = api.container.lookup("service:capabilities");
  if (isAppWebview) {
    return;
  }

  const login = api.container.lookup("service:login");
  if (login.isOnlyOneExternalLoginMethod) {
    attemptAutoLogin(login);
  }
}

function attemptAutoLogin(login) {
  const { pathname: url } = window.location;
  const { search: query } = window.location;
  const { referrer } = document;

  // api.renderInOutlet("above-main-container", Dummy);

  if (isValidDestinationUrl(url)) {
    cookie("destination_url", url + query);
  } else if (DiscourseURL.isInternalTopic(referrer)) {
    cookie("destination_url", referrer);
  }
  const loginMethod = login.externalLoginMethods[0];
  // this naturally flows into a redirect
  loginMethod.doLogin({ signup: false, params: { silent: true } });
}

export default {
  name: "auto-login",
  after: "inject-objects",
  initialize() {
    withPluginApi((api) => {
      autoLoginIfNeeded(api);
    });
  },
};
