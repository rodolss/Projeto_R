package io.github.rodolss.projetor

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Disparado pelo AlarmManager na hora (aproximada) do lembrete. */
class LembreteReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        Lembretes.notificar(
            ctx,
            intent.getIntExtra("id", 0),
            intent.getStringExtra("titulo") ?: "Projeto R",
            intent.getStringExtra("texto") ?: Lembretes.TEXTO_PRINCIPAL,
            intent.getStringExtra("rota") ?: "#/mes",
        )
    }
}
