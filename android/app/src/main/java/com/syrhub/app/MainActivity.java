package com.syrhub.app;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Build;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
/** HTTPS shell with no JavaScript/native bridge. */
public class MainActivity extends Activity {
    private WebView webView;
    private Uri site;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        site=Uri.parse(getString(R.string.site_url));
        webView=new WebView(this);
        setContentView(webView);
        if(Build.VERSION.SDK_INT>=30)getWindow().setDecorFitsSystemWindows(false);
        webView.setOnApplyWindowInsetsListener((view,insets) -> {
            if(Build.VERSION.SDK_INT>=30){
                android.graphics.Insets safe=insets.getInsets(WindowInsets.Type.statusBars() | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                view.setPadding(safe.left,safe.top,safe.right,safe.bottom);
            }else{
                view.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
            }
            return insets;
        });
        hideNavigationBar();
        WebSettings settings=webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setTextZoom(100);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setUserAgentString(settings.getUserAgentString()+" SyrHubAndroid/1.10");
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request) {
                Uri target=request.getUrl();
                if(!request.isForMainFrame())return false;
                if("https".equals(target.getScheme()) && site.getHost().equals(target.getHost()) && target.getPort()==site.getPort())return false;
                if("https".equals(target.getScheme()) || "mailto".equals(target.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW,target)); } catch(ActivityNotFoundException ignored) {}
                }
                return true;
            }
        });
        if(state==null)webView.loadUrl(site.toString());else webView.restoreState(state);
    }
    private void hideNavigationBar(){
        if(Build.VERSION.SDK_INT>=30){
            WindowInsetsController controller=getWindow().getInsetsController();
            if(controller!=null){
                controller.hide(WindowInsets.Type.navigationBars());
                controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                controller.setSystemBarsAppearance(WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS,WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS);
            }
        }else{
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        }
    }
    @Override public void onWindowFocusChanged(boolean focused){super.onWindowFocusChanged(focused);if(focused)hideNavigationBar();}
    @Override protected void onResume(){
        super.onResume();
        hideNavigationBar();
        if(webView!=null){
            webView.onResume();
            // The website fetches the live catalog, including changes from the admin.
            webView.evaluateJavascript("window.dispatchEvent(new Event('syh:resume'));",null);
        }
    }
    @Override protected void onPause(){if(webView!=null)webView.onPause();super.onPause();}
    @Override protected void onSaveInstanceState(Bundle state){super.onSaveInstanceState(state);webView.saveState(state);}
    @Override public void onBackPressed(){if(webView.canGoBack())webView.goBack();else super.onBackPressed();}
    @Override protected void onDestroy(){webView.destroy();super.onDestroy();}
}
