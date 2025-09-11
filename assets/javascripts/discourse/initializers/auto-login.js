import cookie, { removeCookie } from "discourse/lib/cookie";
import getURL from "discourse/lib/get-url";
import { withPluginApi } from "discourse/lib/plugin-api";
import DiscourseURL from "discourse/lib/url";
import { isValidDestinationUrl } from "discourse/lib/utilities";
import Splash from "../components/splash";

const NO_AUTO_LOGIN_COOKIE = "no_auto_login";

function autoLoginIfNeeded(api, container) {
  const siteSettings = container.lookup("service:site-settings");
  if (!siteSettings.auto_login_enabled) {
    return;
  }

  const currentUser = api.getCurrentUser();
  if (currentUser) {
    if (siteSettings.auto_login_strategy === "iframe" && window.frameElement) {
      window.parent.postMessage({ message: "successful auto login" });
    }
    removeCookie(NO_AUTO_LOGIN_COOKIE);
    return;
  }

  if (cookie(NO_AUTO_LOGIN_COOKIE)) {
    return;
  }

  const { isAppWebview } = container.lookup("service:capabilities");
  if (isAppWebview) {
    return;
  }

  const login = container.lookup("service:login");
  if (login.isOnlyOneExternalLoginMethod) {
    if (siteSettings.auto_login_strategy === "redirect") {
      api.renderInOutlet("above-main-container", Splash);
      attemptAutoLoginByRedirect(login);
    } else {
      attemptAutoLoginByIframe();
    }
  }
}

function attemptAutoLoginByRedirect(login) {
  const { pathname: url } = window.location;
  const { search: query } = window.location;
  const { referrer } = document;

  if (isValidDestinationUrl(url)) {
    cookie("destination_url", url + query);
  } else if (DiscourseURL.isInternalTopic(referrer)) {
    cookie("destination_url", referrer);
  }
  const loginMethod = login.externalLoginMethods[0];
  // this naturally flows into a redirect
  loginMethod.doLogin({ signup: false, params: { silent: true } });
}

function attemptAutoLoginByIframe() {
  if (window.frameElement) {
    // don't try to iframe login if we're already in an iframe
    return;
  }
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = getURL("/login");
  iframe.id = "auto-login-iframe";
  document.body.appendChild(iframe);
  window.addEventListener("message", successfulAutoLoginByIframe);
  // if we don't hear back in 1 minute, give up
  setTimeout(() => {
    if (iframe) {
      iframe.remove();
    }
    window.removeEventListener("message", successfulAutoLoginByIframe);
    cookie(NO_AUTO_LOGIN_COOKIE, "1");
  }, 60_000);
}

function successfulAutoLoginByIframe(event) {
  if (event.origin !== window.location.origin) {
    return;
  }
  if (event.data?.message === "successful auto login") {
    window.removeEventListener("message", successfulAutoLoginByIframe);
    const iframe = document.getElementById("auto-login-iframe");
    if (iframe) {
      iframe.remove();
    }

    // iframe would have the session cookies, which would automatically be propogated
    // to the parent frame, so we can just reload to pick up the new session.
    // Using refresh instead of attempting in app loading as there are many
    // things that could go wrong with in app loading (ember data cache, current user
    // not updating etc)
    window.location.reload();
  }
}

export default {
  name: "auto-login",
  after: "inject-objects",
  initialize(container) {
    withPluginApi((api) => {
      autoLoginIfNeeded(api, container);
    });
  },
};
