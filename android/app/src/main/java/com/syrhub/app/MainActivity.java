package com.syrhub.app;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
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
        WebSettings settings=webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setUserAgentString(settings.getUserAgentString()+" SyrHubAndroid/1.08");
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
    @Override protected void onSaveInstanceState(Bundle state){super.onSaveInstanceState(state);webView.saveState(state);}
    @Override public void onBackPressed(){if(webView.canGoBack())webView.goBack();else super.onBackPressed();}
    @Override protected void onDestroy(){webView.destroy();super.onDestroy();}
}
