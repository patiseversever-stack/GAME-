// Bora Kayın'ın parkur sonrası taktığı lakaplar. Klipte ve paylaşımda görünür.
export function boraLakabi({ rank, total, hits, falls, seconds }) {
  if (rank === 1 && hits === 0 && falls === 0)
    return { lakap: 'Kuyruklu Yıldız', soz: 'Tek hata yok! Parkur yalan söylemez, sen de söyletmedin.' };
  if (rank === 1) return { lakap: 'Ada Fırtınası', soz: 'Tökezledin ama kimse seni tutamadı!' };
  if (falls >= 2) return { lakap: 'Dalgıç Adayı', soz: 'Suyu bu kadar seviyorsan Ece seni yüzmeye çağırır.' };
  if (hits >= 4) return { lakap: 'İnatçı Keçi', soz: 'Her engele kafa attın, ama vazgeçmedin!' };
  if (rank === total) return { lakap: 'Kaplumbağa Usta', soz: 'Yavaş ama emin adımlarla... biraz fazla emin.' };
  if (rank === 2) return { lakap: 'Gölge Avcı', soz: 'Liderin ensesindeydin. Bir dahakine önüne geç!' };
  if (seconds < 52) return { lakap: 'Rüzgâr Ayak', soz: 'Hızlıydın, sadece biraz daha temiz koş.' };
  return { lakap: 'Sabırlı Taş', soz: 'Sağlam koştun. Ada sabırlıyı sever.' };
}
