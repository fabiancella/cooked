/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'share',
  name: 'CookedShare',
  displayName: 'Cooked',
  bundleIdentifier: '.share',
  deploymentTarget: '15.1',
  exportJs: false,
  entitlements: {
    'com.apple.security.application-groups': ['group.com.fcella.cooked'],
  },
};
