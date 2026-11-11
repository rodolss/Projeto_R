package io.github.rodolss.projetor

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Reiniciar o celular (ou atualizar o app) apaga os alarmes: reagenda a última lista recebida do site. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED || intent.action == Intent.ACTION_MY_PACKAGE_REPLACED) {
            Lembretes.reagendarSalvos(ctx)
        }
    }
}
