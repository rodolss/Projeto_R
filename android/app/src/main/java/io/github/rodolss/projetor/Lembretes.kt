package io.github.rodolss.projetor

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat

/**
 * Lembretes do dia do pagamento (spec do app Android, §5). O site calcula as datas e manda a lista pela ponte;
 * aqui só se agenda (AlarmManager, horário aproximado), guarda a lista para depois de reiniciar e notifica.
 */
object Lembretes {
    const val CANAL = "lembretes"
    const val TEXTO_PRINCIPAL = "Caiu o salário? Atualize os saldos da corretora e veja quanto investir."
    private const val PREFS = "lembretes"
    private const val LISTA = "lista"

    fun criarCanal(ctx: Context) {
        val canal = NotificationChannel(CANAL, "Lembretes do pagamento", NotificationManager.IMPORTANCE_DEFAULT)
        ctx.getSystemService(NotificationManager::class.java).createNotificationChannel(canal)
    }

    /** Troca a agenda inteira: cancela os lembretes antigos, guarda a lista nova e agenda os que ainda vão acontecer. */
    fun agendar(ctx: Context, json: String) {
        val novos = LeitorLembretes.ler(json) // valida antes de mexer em qualquer coisa
        val prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        for (antigo in LeitorLembretes.ler(prefs.getString(LISTA, "[]") ?: "[]")) cancelar(ctx, antigo.id)
        prefs.edit().putString(LISTA, LeitorLembretes.paraJson(novos)).apply()
        agendarLista(ctx, novos)
    }

    /** Depois de reiniciar o celular (ou atualizar o app), os alarmes somem: reagenda a última lista recebida. */
    fun reagendarSalvos(ctx: Context) {
        agendarLista(ctx, LeitorLembretes.ler(ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(LISTA, "[]") ?: "[]"))
    }

    private fun agendarLista(ctx: Context, lista: List<ItemLembrete>) {
        val alarmes = ctx.getSystemService(AlarmManager::class.java)
        val agora = System.currentTimeMillis()
        for (l in lista) {
            if (l.quando <= agora) continue
            val intent = Intent(ctx, LembreteReceiver::class.java)
                .putExtra("id", l.id)
                .putExtra("titulo", l.titulo)
                .putExtra("texto", l.texto)
                .putExtra("rota", l.rota)
            val pendente = PendingIntent.getBroadcast(
                ctx, l.id, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
            )
            // Inexato de propósito: chega "por volta" do horário, sem a permissão de alarme exato.
            alarmes.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, l.quando, pendente)
        }
    }

    private fun cancelar(ctx: Context, id: Int) {
        val pendente = PendingIntent.getBroadcast(
            ctx, id, Intent(ctx, LembreteReceiver::class.java), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_NO_CREATE,
        ) ?: return
        ctx.getSystemService(AlarmManager::class.java).cancel(pendente)
        pendente.cancel()
    }

    fun permitido(ctx: Context): Boolean {
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) return false
        return NotificationManagerCompat.from(ctx).areNotificationsEnabled()
    }

    /** Sem permissão, não posta nada (e não trava). Tocar abre o app na rota pedida (#/mes). */
    fun notificar(ctx: Context, id: Int, titulo: String, texto: String, rota: String) {
        criarCanal(ctx)
        if (!permitido(ctx)) return
        val abrir = Intent(ctx, MainActivity::class.java)
            .putExtra(MainActivity.EXTRA_ROTA, rota)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        val toque = PendingIntent.getActivity(ctx, id, abrir, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val notificacao = NotificationCompat.Builder(ctx, CANAL)
            .setSmallIcon(R.drawable.ic_notificacao)
            .setContentTitle(titulo)
            .setContentText(texto)
            .setStyle(NotificationCompat.BigTextStyle().bigText(texto))
            .setContentIntent(toque)
            .setAutoCancel(true)
            .build()
        try {
            NotificationManagerCompat.from(ctx).notify(id, notificacao)
        } catch (erro: SecurityException) {
            // A permissão foi retirada entre a checagem e o aviso: não há o que fazer.
        }
    }
}
