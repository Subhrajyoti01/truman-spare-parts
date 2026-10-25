(() => {
  const U = window.TrumanUtils;
  let signup = false;
  let recoveryMode = false;
  const authView = () => U.$('#auth-view');
  const appShell = () => U.$('#app-shell');
  const message = text => { U.$('#auth-message').textContent = text || ''; };

  function showRecovery() {
    recoveryMode = true;
    signup = false;
    appShell().classList.add('hidden');
    authView().classList.remove('hidden');
    U.$('#auth-title').textContent = 'Choose a new password';
    U.$('#auth-subtitle').textContent = 'Enter a new password for your TEAM TRUMAN account.';
    U.$('#auth-form').classList.add('hidden');
    U.$('#auth-actions').classList.add('hidden');
    U.$('#reset-password-form').classList.remove('hidden');
    message('');
  }

  function showNormalAuth() {
    recoveryMode = false;
    U.$('#auth-form').classList.remove('hidden');
    U.$('#auth-actions').classList.remove('hidden');
    U.$('#reset-password-form').classList.add('hidden');
    U.$('#auth-title').textContent = signup ? 'Create account' : 'Sign in';
    U.$('#auth-subtitle').textContent = 'Spare Parts Inventory Management System';
  }

  window.TrumanAuth = {
    init: async () => {
      const c = window.TRUMAN_CONFIG || {};
      const missing = !c.supabaseUrl || !c.supabaseAnonKey || c.supabaseUrl.includes('YOUR-PROJECT') || c.supabaseAnonKey.includes('YOUR_SUPABASE');
      if (missing) {
        U.$('#setup-banner').classList.remove('hidden');
        U.$('#setup-banner').textContent = 'Setup required: edit config.js with your Supabase project URL and public anon/publishable key. Never put a service-role key here.';
        U.$('#connection-label').textContent = 'Not configured';
        return;
      }
      try {
        window.sb = window.supabase.createClient(c.supabaseUrl, c.supabaseAnonKey, {
          auth: { detectSessionInUrl: true, flowType: 'pkce' }
        });
        const queryParams = new URLSearchParams(location.search);
        const isRecoveryLink = /(?:^|[&#])type=recovery(?:&|$)/i.test(location.hash) || queryParams.get('type') === 'recovery' || queryParams.has('code');
        if (isRecoveryLink) showRecovery();
        const { data: { session } } = await window.sb.auth.getSession();
        if (isRecoveryLink) showRecovery();
        else if (session) await window.TrumanAuth.enter(session.user);
        window.sb.auth.onAuthStateChange((event, session) => {
          setTimeout(async () => {
            if (event === 'PASSWORD_RECOVERY') { showRecovery(); return; }
            if (recoveryMode) return;
            if (session) await window.TrumanAuth.enter(session.user);
            else window.TrumanAuth.leave();
          }, 0);
        });
        U.$('#connection-label').textContent = 'Supabase connected';
        U.$('.status-dot').classList.add('online');
      } catch (e) { U.toast(U.err(e), 'error'); }
    },
    enter: user => {
      if (recoveryMode) return;
      authView().classList.add('hidden');
      appShell().classList.remove('hidden');
      U.$('#user-email').textContent = user.email || 'Signed in';
      window.TrumanApp.start();
    },
    leave: () => {
      if (recoveryMode) return;
      appShell().classList.add('hidden');
      authView().classList.remove('hidden');
      showNormalAuth();
    },
    signOut: async () => {
      const { error } = await window.sb.auth.signOut();
      if (error) U.toast(U.err(error), 'error');
    },
    submit: async e => {
      e.preventDefault();
      const email = U.$('#auth-email').value.trim(), password = U.$('#auth-password').value;
      const msg = U.$('#auth-message'), btn = U.$('#auth-submit');
      btn.disabled = true; msg.textContent = '';
      try {
        if (signup) {
          const { error } = await window.sb.auth.signUp({ email, password });
          if (error) throw error;
          msg.textContent = 'Account created. Check your email if confirmation is enabled, then ask your workshop administrator to add your membership.';
        } else {
          const { error } = await window.sb.auth.signInWithPassword({ email, password });
          if (error) throw error;
        }
      } catch (e) { msg.textContent = U.err(e); }
      finally { btn.disabled = false; }
    },
    toggle: () => {
      signup = !signup;
      U.$('#auth-title').textContent = signup ? 'Create account' : 'Sign in';
      U.$('#auth-submit').textContent = signup ? 'Create account' : 'Sign in';
      U.$('#auth-toggle').textContent = signup ? 'Back to sign in' : 'Create account';
      U.$('#auth-password').autocomplete = signup ? 'new-password' : 'current-password';
    },
    forgot: async () => {
      const email = U.$('#auth-email').value.trim();
      if (!email) { message('Enter your email first.'); return; }
      const redirectTo = `${location.origin}${location.pathname}`;
      const { error } = await window.sb.auth.resetPasswordForEmail(email, { redirectTo });
      message(error ? U.err(error) : 'If the account exists, a password reset email has been sent. Open the email on this website, then choose a new password here.');
    },
    updatePassword: async e => {
      e.preventDefault();
      const password = U.$('#new-password').value;
      const confirm = U.$('#confirm-new-password').value;
      const btn = U.$('#save-new-password');
      if (password.length < 8) { message('Use at least 8 characters for your new password.'); return; }
      if (password !== confirm) { message('The passwords do not match.'); return; }
      btn.disabled = true; message('Updating password…');
      try {
        const { data: { session }, error: sessionError } = await window.sb.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session) throw new Error('This reset link is invalid or expired. Request a new password reset email and open the newest link.');
        const { error } = await window.sb.auth.updateUser({ password });
        if (error) throw error;
        await window.sb.auth.signOut();
        U.$('#reset-password-form').reset();
        showNormalAuth();
        U.$('#auth-email').value = session.user.email || U.$('#auth-email').value;
        message('Password changed successfully. Sign in using your new password.');
        history.replaceState(null, document.title, `${location.origin}${location.pathname}`);
      } catch (e) { message(U.err(e)); }
      finally { btn.disabled = false; }
    }
  };

  U.$('#auth-form').addEventListener('submit', window.TrumanAuth.submit);
  U.$('#auth-toggle').onclick = window.TrumanAuth.toggle;
  U.$('#forgot-password').onclick = () => window.TrumanAuth.forgot().catch(e => U.toast(U.err(e), 'error'));
  U.$('#reset-password-form').addEventListener('submit', window.TrumanAuth.updatePassword);
  U.$('#back-to-login').onclick = () => { showNormalAuth(); message(''); };
  U.$('#sign-out').onclick = window.TrumanAuth.signOut;
})();
