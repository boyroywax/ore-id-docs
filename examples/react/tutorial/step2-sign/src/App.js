import React, { Component } from 'react';
// import ReactDOM from 'react-dom';
import { OreId } from 'oreid-js';
import LoginButton from 'oreid-login-button';
import OreIdWebWidget from 'oreid-react-web-widget';
import { encode as base64Encode } from 'base-64';
import './App.css';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      userInfo: {},
      errors: '',
      isLoggedIn: false,
      authInfo: {},
      oreIdResult: '',
      showWidget: false,
    };
    this.handleSubmit = this.handleLogin.bind(this);
    this.handleLogout = this.handleLogout.bind(this);
    this.showWidget = this.showWidget.bind(this);
    this.onCloseModal = this.onCloseWidget.bind(this);
  }

  authCallbackUrl = `${window.location.origin}/authcallback`;

  // Intialize oreId
  // IMPORTANT - For a production app, you must protect your api key. A create-react-app app will leak the key since it all runs in the browser.
  // To protect the key, you need to set-up a proxy server. See https://github.com/TeamAikon/ore-id-docs/tree/master/examples/react/advanced/react-server
  myOreIdOptions = {
    appName: "My app",
    appId: process.env.REACT_APP_OREID_APP_ID,
    apiKey: process.env.REACT_APP_OREID_API_KEY,
    authCallbackUrl: this.authCallbackUrl,
    signCallbackUrl: this.authCallbackUrl
  }
  oreId = new OreId(this.myOreIdOptions);

  async componentWillMount() {
    await this.loadUserFromLocalStorage();
    await this.handleAuthCallback(); // handles the auth callback url
  }

  /* Call oreId.login() - this returns a redirect url which will launch the login flow (for the specified provider)
     When complete, the browser will be redirected to the authCallbackUrl (specified in oredId options) */
  async handleLogin(event, provider) {
    event.preventDefault();
    this.setState({ errors: null });
    let { loginUrl } = await this.oreId.login({ provider });
    window.location = loginUrl; // redirect browser to loginURL to start the login flow
  }

  /** Remove user info from local storage */
  async handleLogout() {
    this.setState({ errors: {}, userInfo: {}, isLoggedIn: false });
    this.oreId.logout();
    window.location = window.location.origin; // clear callback url in browser
  }

  /** Load the user from local storage - user info is automatically saved to local storage by oreId.getUserInfoFromApi() */
  async loadUserFromLocalStorage() {
    let accessToken = this.oreId.accessToken
    if(!accessToken) return
    let userInfo = (await this.oreId.getUser()) || {};
    this.setState({ userInfo, isLoggedIn: true });
  }

  /** Retrieve user info from ORE ID service - user info is automatically saved to local storage */
  async loadUserFromApi(account) {
    const userInfo = (await this.oreId.getUserInfoFromApi(account)) || {};
    if (userInfo.accountName) this.setState({ userInfo, isLoggedIn: true });
  }

  /* Handle the authCallback coming back from ORE ID with an "account" parameter indicating that a user has logged in */
  async handleAuthCallback() {
    const urlPath = `${window.location.origin}${window.location.pathname}`;
    if (urlPath === this.authCallbackUrl) {
      const { account, errors } = this.oreId.handleAuthResponse(
        window.location.href
      );
      if (!errors) {
        await this.loadUserFromApi(account);
        this.setState({ isLoggedIn: true });
      } else {
        this.setState({ errors });
      }
    }
  }

  getFirstChainAccountForUserByChainType(chainNetwork) {
    const matchingPermission = this.state?.userInfo?.permissions?.find(
      p => p.chainNetwork === chainNetwork
    );
    const { chainAccount, permission: permissionName } = matchingPermission || {};
    return { chainAccount, permissionName };
  }

  createSampleTransactionEos(actor, permission = 'active') {
    const transaction = {
      account: 'demoapphello',
      name: 'hi',
      authorization: [
        {
          actor,
          permission,
        },
      ],
      data: {
        user: actor,
      },
    };
    return transaction;
  }

  renderLoggedIn() {
    const signWithChainNetwork = 'eos_kylin';
    const { accountName, email, name, picture, username } = this.state.userInfo;
    const { chainAccount, permissionName } =
      this.getFirstChainAccountForUserByChainType(signWithChainNetwork);
    return (
      <div style={{ marginTop: 50, marginLeft: 40 }}>
        <h4>User Info</h4>
        <img
          src={picture}
          style={{ width: 100, height: 100, paddingBottom: 30 }}
          alt={'user'}
        />
        <br />
        OreId account: {accountName}
        <br />
        name: {name}
        <br />
        username: {username}
        <br />
        email: {email}
        <br />
        <div className="App-success">{this?.state?.oreIdResult}</div>
        <LoginButton
          provider="oreid"
          text="Sign with OreID"
          onClick={e => this.showWidget()}
        />
        <OreIdWebWidget
          show={this.state.showWidget}
          oreIdOptions={{
            ...this.myOreIdOptions,
            accessToken: this.oreId.accessToken,
          }}
          action={{
            name: 'sign',
            params: {
              // provider: "google", // optional - must be a login provider supported by ORE ID
              account: accountName,
              broadcast: true, // if broadcast=true, ore id will broadcast the transaction to the chain network for you
              chainAccount: chainAccount,
              chainNetwork: signWithChainNetwork,
              state: 'yourstate', // anything you'd like to remember after the callback
              transaction: base64Encode(
                JSON.stringify(
                  this.createSampleTransactionEos(chainAccount, permissionName)
                )
              ),
              returnSignedTransaction: false,
              preventAutoSign: true, // prevent auto sign even if transaction is auto signable
            }
          }}
          onSuccess={result => {
            this.setState({ oreIdResult: JSON.stringify(result, null, '\t') });
            this.onCloseWidget();
          }}
          onError={result => {
            this.setState({ errors: result?.errors });
            this.onCloseWidget();
          }}
        />
      </div>
    );
  }

  showWidget() {
    this.setState({ errors: null });
    this.setState({ showWidget: true });
  }

  onCloseWidget() {
    this.setState({ showWidget: false });
  }

  renderLoggedOut() {
    return (
      <div>
        <LoginButton
          provider="facebook"
          onClick={e => this.handleLogin(e, 'facebook')}
        />
        <LoginButton
          provider="google"
          onClick={e => this.handleLogin(e, 'google')}
        />
      </div>
    );
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          {this.state.isLoggedIn ? (
            <div>{this.renderLoggedIn()} </div>
          ) : (
            <div>{this.renderLoggedOut()} </div>
          )}
          {this.state.errors && (
            <div className="App-error">Error: {this.state.errors}</div>
          )}
        </header>
      </div>
    );
  }
}

export default App;
