import Component from "@glimmer/component";

/**
 * copied from discourse core
 * discourse/app/views/common/_discourse_splash.html.erb
 */
export default class Splash extends Component {
  <template>
    <section id="d-splash" class="auto-login-redirect-loader">
      <div class="preloader-image" elementtiming="discourse-splash-visible">
        <div class="dots" style="--n:-2;"></div>
        <div class="dots" style="--n:-1;"></div>
        <div class="dots" style="--n:0;"></div>
        <div class="dots" style="--n:1;"></div>
        <div class="dots" style="--n:2;"></div>
      </div>
    </section>
  </template>
}
