package io.github.rodolss.projetor

import org.json.JSONArray
import org.json.JSONObject

data class ItemLembrete(val id: Int, val quando: Long, val titulo: String, val texto: String, val rota: String)

/**
 * Lê a lista de lembretes vinda do site ({tipo:'agendar', lembretes:[...]}) ou a lista guardada (só o array).
 * Nunca lança exceção: itens fora do formato são descartados. O site é publicado separado do APK, então uma
 * mensagem estranha não pode fazer o app fechar (nem a cada abertura, nem a cada reinício do celular).
 */
object LeitorLembretes {
    private val ROTA_VALIDA = Regex("^#/[a-z-]+$")

    fun ler(texto: String): List<ItemLembrete> {
        val lista = try {
            val limpo = texto.trim()
            if (limpo.startsWith("[")) JSONArray(limpo) else JSONObject(limpo).optJSONArray("lembretes")
        } catch (erro: Exception) {
            null
        } ?: return emptyList()

        val itens = mutableListOf<ItemLembrete>()
        for (i in 0 until lista.length()) {
            val o = lista.optJSONObject(i) ?: continue
            if (!o.has("id")) continue
            val id = o.optInt("id", -1)
            val quando = o.optLong("quando", -1L)
            if (id < 0 || quando <= 0L) continue
            val rota = o.optString("rota", "#/mes").takeIf { ROTA_VALIDA.matches(it) } ?: "#/mes"
            itens.add(ItemLembrete(id, quando, o.optString("titulo", "Projeto R"), o.optString("texto", Lembretes.TEXTO_PRINCIPAL), rota))
        }
        return itens
    }

    fun paraJson(itens: List<ItemLembrete>): String {
        val array = JSONArray()
        for (l in itens) {
            array.put(JSONObject().put("id", l.id).put("quando", l.quando).put("titulo", l.titulo).put("texto", l.texto).put("rota", l.rota))
        }
        return array.toString()
    }
}
