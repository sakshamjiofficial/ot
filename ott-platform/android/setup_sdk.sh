#!/bin/bash
set -e

# Configuration
SDK_VERSION="11076708"
SDK_URL="https://dl.google.com/android/repository/commandlinetools-linux-${SDK_VERSION}_latest.zip"
export ANDROID_HOME="/workspaces/Kaler/android-sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export JAVA_HOME="/usr/local/sdkman/candidates/java/21.0.10-ms"
export PATH="$JAVA_HOME/bin:$PATH"

echo "=== System Info ==="
echo "Java Version:"
java -version

echo "=== Setting up Android SDK directories ==="
mkdir -p "$ANDROID_HOME"
cd "$ANDROID_HOME"

if [ ! -d "cmdline-tools/latest" ]; then
    echo "Downloading Command-line Tools..."
    curl -o cmdline-tools.zip -L "$SDK_URL"
    
    echo "Extracting Command-line Tools..."
    mkdir -p cmdline-tools-temp
    unzip -q cmdline-tools.zip -d cmdline-tools-temp
    
    mkdir -p cmdline-tools/latest
    mv cmdline-tools-temp/cmdline-tools/* cmdline-tools/latest/
    
    rm -rf cmdline-tools-temp cmdline-tools.zip
    echo "Command-line Tools installed."
else
    echo "Command-line Tools already installed."
fi

# Set path to include sdkmanager
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

echo "=== Installing Android SDK Components ==="
# Accept licenses automatically
yes | sdkmanager --licenses

echo "Installing platforms;android-34, build-tools;34.0.0, and platform-tools..."
sdkmanager --install "platforms;android-34" "build-tools;34.0.0" "platform-tools"

echo "=== Android SDK setup completed successfully ==="
