package io.github.rodolss.projetor

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.View
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.Toast
import androidx.webkit.JavaScriptReplyProxy
import androidx.webkit.WebMessageCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature

/**
 * Casca do Projeto R: abre o site publicado num WebView (com o service worker do site, para funcionar sem
 * internet depois da primeira abertura) e expõe a ponte `window.ProjetoRAndroid` só para a origem do site.
 */
class MainActivity : Activity() {

    companion object {
        const val URL_INICIAL = "https://rodolss.github.io/Projeto_R/"
        const val ORIGEM = "https://rodolss.github.io"
        const val PREFIXO = "/Projeto_R/"
        private const val TAG = "ProjetoR"

        /** Só as páginas do Projeto R ficam dentro do app; o resto abre no navegador. */
        fun ehDoApp(uri: Uri): Boolean =
            uri.scheme == "https" && uri.host == "rodolss.github.io" && (uri.path ?: "").startsWith(PREFIXO)
    }

    private lateinit var web: WebView
    private lateinit var semInternet: View

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        web = findViewById(R.id.web)
        semInternet = findViewById(R.id.semInternet)
        findViewById<Button>(R.id.tentarDeNovo).setOnClickListener {
            semInternet.visibility = View.GONE
            web.visibility = View.VISIBLE
            web.reload()
        }

        web.settings.javaScriptEnabled = true
        web.settings.domStorageEnabled = true
        web.settings.cacheMode = WebSettings.LOAD_DEFAULT
        web.webViewClient = Cliente()
        registrarPonte() // antes do primeiro loadUrl, para valer já na primeira página

        if (savedInstanceState != null) web.restoreState(savedInstanceState) else web.loadUrl(URL_INICIAL)
    }

    /** A ponte é injetada pelo próprio WebView em toda página da origem, venha ela da rede ou do cache. */
    private fun registrarPonte() {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            Log.w(TAG, "WebView sem suporte a WEB_MESSAGE_LISTENER; a ponte não estará disponível")
            return
        }
        WebViewCompat.addWebMessageListener(web, "ProjetoRAndroid", setOf(ORIGEM)) {
                _: WebView, mensagem: WebMessageCompat, _: Uri, _: Boolean, _: JavaScriptReplyProxy ->
            Log.i(TAG, "Mensagem do site: ${mensagem.data}")
        }
    }

    private inner class Cliente : WebViewClient() {
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            val uri = request.url
            if (ehDoApp(uri)) return false
            try {
                startActivity(Intent(Intent.ACTION_VIEW, uri))
            } catch (erro: Exception) {
                Log.w(TAG, "Nenhum app para abrir $uri", erro)
            }
            return true
        }

        override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
            if (request.isForMainFrame) {
                web.visibility = View.INVISIBLE
                semInternet.visibility = View.VISIBLE
            }
        }

        override fun onPageFinished(view: WebView, url: String) {
            if (!ehDoApp(Uri.parse(url))) return
            // Diagnóstico da fase 1: confirma que a ponte existe, inclusive sem internet. Sai na Task 6.
            view.evaluateJavascript("typeof window.ProjetoRAndroid") { resultado ->
                if (resultado == "\"object\"") Toast.makeText(this@MainActivity, "Ponte nativa OK", Toast.LENGTH_SHORT).show()
            }
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        web.saveState(outState)
    }

    @Deprecated("Mantido para o botão voltar em todas as versões suportadas (Android 8 em diante)")
    override fun onBackPressed() {
        if (web.canGoBack()) web.goBack() else @Suppress("DEPRECATION") super.onBackPressed()
    }
}
