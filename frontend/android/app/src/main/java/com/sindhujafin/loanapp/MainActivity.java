package com.sindhujafin.loanapp;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // 1. Install Splash Screen
        SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);

        // 2. Fix for Black Screen (Force WebView visibility and background)
        try {
            WebView webView = this.getBridge().getWebView();
            webView.setBackgroundColor(Color.WHITE);
            webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        } catch (Exception e) {
            // Bridge not ready
        }
    }
}