package io.github.rodolss.projetor

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.util.Log
import android.view.View
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import androidx.webkit.JavaScriptReplyProxy
import androidx.webkit.WebMessageCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import org.json.JSONObject

/**
 * Casca do Projeto R: abre o site publicado num WebView (com o service worker do site, para funcionar sem
 * internet depois da primeira abertura) e expõe a ponte `window.ProjetoRAndroid` só para a origem do site.
 *
 * Mensagens do site (texto JSON): {tipo:'agendar', lembretes}, {tipo:'testar'}, {tipo:'permissao?'},
 * {tipo:'pedirPermissao'}. Resposta: {tipo:'permissao', concedida}.
 */
class MainActivity : Activity() {

    companion object {
        const val URL_INICIAL = "https://rodolss.github.io/Projeto_R/"
        const val ORIGEM = "https://rodolss.github.io"
        const val PREFIXO = "/Projeto_R/"
        const val EXTRA_ROTA = "rota"
        private const val TAG = "ProjetoR"
        private const val PEDIDO_NOTIFICACAO = 1
        private const val ID_TESTE = 999
        private const val ESTADO_URL = "url"
        private val ROTA_VALIDA = Regex("^#/[a-z-]+$")

        /** Só as páginas do Projeto R ficam dentro do app; o resto abre no navegador. */
        fun ehDoApp(uri: Uri): Boolean =
            uri.scheme == "https" && uri.host == "rodolss.github.io" && (uri.path ?: "").startsWith(PREFIXO)
    }

    private lateinit var web: WebView
    private lateinit var semInternet: View
    private var ultimaResposta: JavaScriptReplyProxy? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        web = findViewById(R.id.web)
        semInternet = findViewById(R.id.semInternet)
        findViewById<Button>(R.id.tentarDeNovo).setOnClickListener {
            semInternet.visibility = View.GONE
            web.visibility = View.VISIBLE
            web.loadUrl(URL_INICIAL) // mais garantido que reload() depois de uma página de erro
        }

        web.settings.javaScriptEnabled = true
        web.settings.domStorageEnabled = true
        web.settings.cacheMode = WebSettings.LOAD_DEFAULT
        web.webViewClient = Cliente()
        registrarPonte() // antes do primeiro loadUrl, para valer já na primeira página

        Lembretes.criarCanal(this)
        pedirPermissaoNaPrimeiraVez()

        // Ao recriar a tela (ex.: o celular trocou para o tema escuro), volta à mesma página. Guarda só o endereço:
        // o histórico inteiro do WebView pode passar do limite de tamanho e fechar o app.
        val salvo = savedInstanceState?.getString(ESTADO_URL)?.takeIf { ehDoApp(Uri.parse(it)) }
        web.loadUrl(salvo ?: (URL_INICIAL + (rotaDe(intent) ?: "")))
    }

    /** Tocar numa notificação com o app já aberto leva à rota pedida (ex.: #/mes) sem recarregar. */
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        rotaDe(intent)?.let { rota -> web.evaluateJavascript("location.hash = '${rota.removePrefix("#")}'", null) }
    }

    override fun onResume() {
        super.onResume()
        // Volta das configurações do Android: conta ao site se as notificações foram liberadas.
        ultimaResposta?.let { responderPermissao(it) }
    }

    private fun rotaDe(intent: Intent?): String? =
        intent?.getStringExtra(EXTRA_ROTA)?.takeIf { ROTA_VALIDA.matches(it) }

    /** A ponte é injetada pelo próprio WebView em toda página da origem, venha ela da rede ou do cache. */
    private fun registrarPonte() {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            Log.w(TAG, "WebView sem suporte a WEB_MESSAGE_LISTENER; a ponte não estará disponível")
            return
        }
        WebViewCompat.addWebMessageListener(web, "ProjetoRAndroid", setOf(ORIGEM)) {
                _: WebView, mensagem: WebMessageCompat, _: Uri, _: Boolean, resposta: JavaScriptReplyProxy ->
            val texto = mensagem.data ?: return@addWebMessageListener
            // Nada que o site mande pode derrubar o app: o site é publicado separado do APK.
            try {
                when (JSONObject(texto).optString("tipo")) {
                    "agendar" -> Lembretes.agendar(this, texto)
                    "testar" -> Lembretes.notificar(this, ID_TESTE, "Projeto R", Lembretes.TEXTO_PRINCIPAL, "#/mes")
                    "permissao?" -> responderPermissao(resposta)
                    "pedirPermissao" -> {
                        ultimaResposta = resposta
                        pedirPermissao()
                    }
                    else -> Log.w(TAG, "Tipo de mensagem desconhecido: $texto")
                }
            } catch (erro: Exception) {
                Log.w(TAG, "Mensagem do site ignorada: $texto", erro)
            }
        }
    }

    private fun responderPermissao(resposta: JavaScriptReplyProxy) {
        val json = JSONObject().put("tipo", "permissao").put("concedida", Lembretes.permitido(this))
        try {
            resposta.postMessage(json.toString())
        } catch (erro: Exception) {
            Log.w(TAG, "Não consegui responder ao site", erro) // a página pode ter sido recarregada
        }
    }

    private fun jaPediuPermissao(): Boolean = getSharedPreferences("app", MODE_PRIVATE).getBoolean("pediuPermissao", false)

    /** Na primeira abertura, o app pede a permissão de notificação (Android 13+); os lembretes já vêm ligados. */
    private fun pedirPermissaoNaPrimeiraVez() {
        if (Build.VERSION.SDK_INT < 33 || jaPediuPermissao()) return
        getSharedPreferences("app", MODE_PRIVATE).edit().putBoolean("pediuPermissao", true).apply()
        if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), PEDIDO_NOTIFICACAO)
        }
    }

    /** Pede de novo quando o Android ainda deixa; senão, abre as configurações de notificação do app. */
    private fun pedirPermissao() {
        if (Build.VERSION.SDK_INT >= 33 &&
            (shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS) || !jaPediuPermissao())
        ) {
            getSharedPreferences("app", MODE_PRIVATE).edit().putBoolean("pediuPermissao", true).apply()
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), PEDIDO_NOTIFICACAO)
            return
        }
        try {
            startActivity(Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, packageName))
        } catch (erro: Exception) {
            Log.w(TAG, "Não consegui abrir as configurações de notificação", erro)
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PEDIDO_NOTIFICACAO) ultimaResposta?.let { responderPermissao(it) }
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
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        web.url?.let { outState.putString(ESTADO_URL, it) }
    }

    @Deprecated("Mantido para o botão voltar em todas as versões suportadas (Android 8 em diante)")
    override fun onBackPressed() {
        if (web.canGoBack()) web.goBack() else @Suppress("DEPRECATION") super.onBackPressed()
    }
}
