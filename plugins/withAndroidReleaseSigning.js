const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Ensures release builds use credentials/keystore.properties after prebuild.
 */
function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    if (contents.includes('credentials/keystore.properties')) {
      return config;
    }

    const releaseSigningConfig = `
        release {
            def keystorePropertiesFile = rootProject.file("../credentials/keystore.properties")
            if (keystorePropertiesFile.exists()) {
                def keystoreProperties = new Properties()
                keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
                storeFile rootProject.file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }`;

    // Insert release signingConfig after the debug signingConfig block.
    contents = contents.replace(
      /(signingConfigs\s*\{\s*debug\s*\{[\s\S]*?\n        \})/,
      `$1${releaseSigningConfig}`
    );

    // Prefer release keystore for release builds when configured.
    contents = contents.replace(
      /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
      `$1signingConfig signingConfigs.release.storeFile != null ? signingConfigs.release : signingConfigs.debug`
    );

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withAndroidReleaseSigning;
