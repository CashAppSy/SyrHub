package com.syrhub.app;
import android.app.Activity;
import android.app.DownloadManager;
import android.os.Environment;
import android.widget.Toast;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Build;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.graphics.Color;
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
        if(Build.VERSION.SDK_INT>=30)getWindow().setDecorFitsSystemWindows(false);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING);
        FrameLayout root=new FrameLayout(this);
        root.setBackgroundColor(Color.WHITE);
        webView=new WebView(this);
        root.addView(webView,new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT,FrameLayout.LayoutParams.MATCH_PARENT));
        // Reserve system space on the parent layout. WebView padding does not
        // reliably move the HTML viewport away from Android system overlays.
        root.setOnApplyWindowInsetsListener((view,insets) -> {
            int left,top,right,bottom;
            if(Build.VERSION.SDK_INT>=30){
                android.graphics.Insets bars=insets.getInsetsIgnoringVisibility(WindowInsets.Type.statusBars() | WindowInsets.Type.displayCutout());
                android.graphics.Insets keyboard=insets.getInsets(WindowInsets.Type.ime() | WindowInsets.Type.navigationBars());
                left=Math.max(bars.left,keyboard.left);top=bars.top;
                right=Math.max(bars.right,keyboard.right);bottom=Math.max(bars.bottom,keyboard.bottom);
            }else{
                left=insets.getSystemWindowInsetLeft();top=insets.getSystemWindowInsetTop();
                right=insets.getSystemWindowInsetRight();bottom=insets.getSystemWindowInsetBottom();
            }
            FrameLayout.LayoutParams layout=(FrameLayout.LayoutParams)webView.getLayoutParams();
            if(layout.leftMargin!=left || layout.topMargin!=top || layout.rightMargin!=right || layout.bottomMargin!=bottom){
                layout.setMargins(left,top,right,bottom);
                webView.setLayoutParams(layout);
            }
            return Build.VERSION.SDK_INT>=30?WindowInsets.CONSUMED:insets.consumeSystemWindowInsets();
        });
        setContentView(root);
        root.post(root::requestApplyInsets);
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
        settings.setUserAgentString(settings.getUserAgentString()+" SyrHubAndroid/1.12");
        webView.setWebChromeClient(new WebChromeClient());
        webView.setDownloadListener((url,userAgent,contentDisposition,mimeType,contentLength) -> {
            Uri target=Uri.parse(url);
            if("application/vnd.android.package-archive".equals(mimeType) || (target.getPath()!=null && target.getPath().toLowerCase(java.util.Locale.ROOT).endsWith(".apk"))) {
                startApkDownload(target,"SyrHub-application.apk");
            } else {
                openExternal(target);
            }
        });
        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request) {
                Uri target=request.getUrl();
                if(!request.isForMainFrame())return false;
                if("https".equals(target.getScheme()) && site.getHost().equals(target.getHost()) && target.getPort()==site.getPort()) {
                    String path=target.getPath();
                    if(path!=null && path.matches("/api/downloads/[A-Za-z0-9_-]{1,150}")) {
                        startApkDownload(target,path.substring(path.lastIndexOf('/')+1)+".apk");return true;
                    }
                    return false;
                }
                if("https".equals(target.getScheme()) || "mailto".equals(target.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW,target)); } catch(ActivityNotFoundException ignored) {}
                }
                return true;
            }
        });
        if(state==null)webView.loadUrl(site.toString());else webView.restoreState(state);
    }
    private void openExternal(Uri target){
        if(!"https".equals(target.getScheme()))return;
        try{startActivity(new Intent(Intent.ACTION_VIEW,target));}catch(ActivityNotFoundException ignored){Toast.makeText(this,"لا يوجد تطبيق لفتح الرابط / No app can open this link",Toast.LENGTH_LONG).show();}
    }
    private void startApkDownload(Uri target,String fileName){
        if(!"https".equals(target.getScheme()) || target.getHost()==null || target.getUserInfo()!=null)return;
        try{
            DownloadManager manager=(DownloadManager)getSystemService(DOWNLOAD_SERVICE);
            DownloadManager.Request download=new DownloadManager.Request(target);
            download.setTitle(fileName);
            download.setDescription("تنزيل تطبيق عبر SyrHub / Downloading from SyrHub");
            download.setMimeType("application/vnd.android.package-archive");
            download.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            // App-specific external storage needs no broad storage permission on Android 8+.
            download.setDestinationInExternalFilesDir(this,Environment.DIRECTORY_DOWNLOADS,System.currentTimeMillis()+"-"+fileName);
            manager.enqueue(download);
            Toast.makeText(this,"بدأ التنزيل. تابع حالته في الإشعارات / Download started. Check notifications",Toast.LENGTH_LONG).show();
        }catch(RuntimeException error){openExternal(target);}
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
