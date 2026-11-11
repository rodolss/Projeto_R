package io.github.rodolss.projetor

import org.junit.Assert.assertEquals
import org.junit.Test

/** A casca nunca pode fechar por causa de uma mensagem do site fora do formato (revisão final, item 1). */
class LeitorLembretesTest {
    private val quando = 1_800_000_000_000L

    @Test
    fun ignoraItensInvalidosSemQuebrar() {
        val json = """{"tipo":"agendar","lembretes":[
            {"id":1,"quando":$quando,"titulo":"Projeto R","texto":"t","rota":"#/mes"},
            {"id":2,"quando":null},
            {"quando":$quando},
            {"id":3,"quando":-5},
            "lixo"
        ]}"""
        val itens = LeitorLembretes.ler(json)
        assertEquals(listOf(1), itens.map { it.id })
        assertEquals(quando, itens[0].quando)
        assertEquals("#/mes", itens[0].rota)
    }

    @Test
    fun textoQuebradoViraListaVazia() {
        assertEquals(emptyList<ItemLembrete>(), LeitorLembretes.ler("{quebrado"))
        assertEquals(emptyList<ItemLembrete>(), LeitorLembretes.ler("""{"tipo":"agendar"}"""))
        assertEquals(emptyList<ItemLembrete>(), LeitorLembretes.ler(""))
    }

    @Test
    fun leTambemAListaSalvaEVoltaIgual() {
        val salvo = """[{"id":4,"quando":$quando,"titulo":"Projeto R","texto":"t","rota":"#/mes"}]"""
        val itens = LeitorLembretes.ler(salvo)
        assertEquals(listOf(4), itens.map { it.id })
        assertEquals(itens, LeitorLembretes.ler(LeitorLembretes.paraJson(itens)))
    }

    @Test
    fun rotaEstranhaViraTelaDoMes() {
        val json = """[{"id":5,"quando":$quando,"rota":"javascript:alert(1)"}]"""
        assertEquals("#/mes", LeitorLembretes.ler(json)[0].rota)
    }
}
