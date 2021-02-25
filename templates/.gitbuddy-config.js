module.exports = function createPackageJsonContent(projName) {
  const configContent = 
`{
  "repository": "",
  "branches": [
    {
      "local": [],
      "remote": []
    }
  ],
  "defaults": {
    "friendly-output": [
      {
        "on-success": true,
        "on-error": true
      }
    ],
    "restrict-push-to-master": false,
    "stage-all": false,
    "attempt-pull-on-prompt": true,
    "push-to-remote-branch": false,
    "create-upstream-branch": false,
    "file-threshold-alert": [
      false,
      {
        "threshold-count": 4
      }
    ]
  }
}
`
  return configContent;
};
