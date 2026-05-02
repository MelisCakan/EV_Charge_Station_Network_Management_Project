# EV Charging Station Network Management - Gereksinim Listesi

**Toplam: 90 Gereksinim** (82 orijinal + 8 yeni eklenen)
**Siniflandirma:** Functional (F) | Non-Functional (NF) | Domain (D)
**Yasam suresi:** Enduring (E) | Volatile (V)

---

## VP1: EV Driver (22 REQ)

### REQ 1.1 - Arac Kaydi (F | E)
EV Drivers must be able to register their electric vehicles by entering brand, model, battery capacity (kWh), connector type (CCS/CHAdeMO/Type2), and license plate number. The system shall store these details and associate them with the driver's account.

### REQ 1.2 - Yakin Istasyon Bulma (F | E)
EV Drivers must be able to locate the nearest available charging stations via a real-time interactive map within the application.

### REQ 1.3 - Renk Kodlu Harita Gosterimi (F | E)
Charging station availability must be indicated on the map using color-coded markers:
- Yesil (#22C55E) = Available (en az 1 charger musait)
- Sari (#EAB308) = Occupied (tumu dolu ama aktif)
- Kirmizi (#EF4444) = Offline (bakim/ariza nedeniyle devre disi)

### REQ 1.4 - Rezervasyon Yapma (F | E)
EV Drivers must be able to reserve a specific charging slot at a station for a selected date and time, with a maximum duration of 2 hours and up to 24 hours in advance.

### REQ 1.5 - Istasyon Filtreleme (F | E)
EV Drivers must be able to filter charging stations by connector type (CCS/CHAdeMO/Type2), charger power output (kW), and maximum unit price (TL/kWh upper limit slider, default range: 0-50 TL/kWh).

### REQ 1.6 - Rota Onerisi (F | E)
The system should provide EV Drivers with a suggested route to the selected charging station using the map's navigation capabilities.

### REQ 1.7 - Sarj Durumu Takibi (F | E)
EV Drivers must be able to view the real-time progress of their ongoing charging session, including current battery level (%), energy consumed (kWh), elapsed time, and estimated cost.

### REQ 1.8 - Sarj Oturumu Baslatma ve Durdurma (F | E)
EV Drivers must be able to start and stop a charging session from the application, subject to a valid reservation and charger availability.

### REQ 1.9 - Maksimum 2 Saat Siniri (D | V)
EV Drivers must be restricted to a maximum of 2 hours per charging session to ensure fair usage of the infrastructure.
**AMENDMENT:** When the 2-hour maximum duration is reached, the system shall automatically complete the charging session, calculate the final cost, deduct the amount from the driver's wallet, generate a digital receipt, and send a notification to the driver stating "Your charging session has been automatically completed due to the 2-hour time limit."

### REQ 1.10 - Favori Istasyon Kaydetme (F | E)
EV Drivers should be able to save frequently used charging stations as favorites for quick access.

### REQ 1.11 - Sorun Bildirimi (F | E)
EV Drivers must be able to report issues with chargers (e.g., malfunction, damage) through the application, including a description and optional photo.

### REQ 1.12 - Gecmis Sarj Oturumlari (F | E)
EV Drivers should be able to view a history of their past charging sessions, including date, station, energy consumed, and cost.

### REQ 1.13 - Dinamik Fiyatlandirma (F | V)
Station Operator, charger bazinda birim fiyati (TL/kWh) manuel olarak gunceller. Guncelleme aninda tum yeni oturumlara anlik yansir. Devam eden oturumlar baslangic fiyati ile devam eder.

### REQ 1.14 - Mesafe ve Tahmini Varis Suresi (F | E)
The system should calculate and display the distance and estimated time of arrival (ETA) to the selected charging station from the driver's current location.

### REQ 1.15 - Bildirimler (F | E)
EV Drivers should receive system notifications for reservation confirmations, charging completion, and low wallet balances.
**AMENDMENT:** The low wallet balance notification threshold is set at 50 TL by default. When the wallet balance drops below this threshold, the system shall send a notification: "Your wallet balance is below 50 TL. Please top up to avoid interruptions." This threshold shall be configurable by the System Administrator.

### REQ 1.16 - Kullanici Kayit ve Giris (F | E) [YENI]
EV Drivers must be able to create an account by providing their full name, email address, phone number, and a password (minimum 8 characters, at least one uppercase letter and one digit). Registered users must be able to log in using their email and password credentials. Upon successful login, the system shall issue a JWT token valid for 24 hours.

### REQ 1.17 - Sifre Sifirlama (F | E) [YENI]
The system must provide a password reset mechanism. When an EV Driver requests a password reset, a time-limited reset link (valid for 15 minutes) shall be sent to their registered email address. The user must set a new password meeting the same complexity rules as registration.

### REQ 1.18 - Rezervasyon Iptali (F | E) [YENI]
EV Drivers must be able to cancel their own confirmed reservations. Cancellations made at least 30 minutes before the reservation start time shall receive a full refund to their wallet. Cancellations made less than 30 minutes before start time shall incur a 20% cancellation fee. Cancellations after the reservation start time are not permitted.

### REQ 1.19 - No-Show Politikasi (D | E) [YENI]
If an EV Driver does not initiate a charging session within 15 minutes after the reservation start time, the system shall automatically cancel the reservation and mark it as "no-show". A 50% penalty fee of the estimated session cost shall be deducted from the driver's wallet. The charger slot shall be released for other users.

### REQ 1.20 - Fatura/Makbuz Goruntuleme (F | E) [YENI]
EV Drivers must be able to view and download their digital receipts for all completed charging sessions. Each receipt shall display: session date/time, station name, charger ID, energy consumed (kWh), unit price (TL/kWh), total amount (TL), and a unique receipt number.

### REQ 1.21 - Sarj Baslama QR Kod Dogrulama (F | E) [YENI]
To initiate a charging session, the EV Driver must scan a QR code displayed on the charger unit using the mobile application. The system shall validate that the scanned QR code matches the reserved charger ID before allowing the session to start. In the prototype, this shall be simulated with a manual charger ID confirmation step.

### REQ 1.22 - Offline Mod / Ag Kesintisi (NF | E) [YENI]
If the EV Driver loses network connectivity during an active charging session, the session shall continue uninterrupted on the charger hardware side. Upon reconnection, the application shall automatically sync the latest session progress data. If connectivity is lost during reservation or payment, the system shall display a clear "No Connection" message and retry the operation automatically when connectivity is restored, within a maximum of 3 attempts.

---

## VP2: Station Operator (14 REQ)

### REQ 2.1 - Istasyon Durumu Yonetimi (F | E)
Station Operators must be able to update the status of individual chargers (Available, Occupied, Offline) via the management interface.

### REQ 2.2 - Bakim Modu (F | E)
Station Operators must be able to place individual chargers into maintenance mode, preventing new reservations and notifying affected users.

### REQ 2.3 - Ariza Bildirimi Goruntuleme (F | E)
Station Operators must be able to view issue reports submitted by EV Drivers and update their resolution status.

### REQ 2.4 - Otomatik Rezervasyon Iptali (F | E)
When a charger is marked as Out-of-Service, the system must automatically cancel all upcoming reservations for that charger and notify the affected EV Drivers.
**AMENDMENT:** For each cancelled reservation due to operator-initiated maintenance, the system must automatically issue a full refund (100%) to the affected EV Driver's wallet and record the refund as a "refund" type Transaction linked to the original reservation.

### REQ 2.5 - Otomatik Bildirim (F | E)
The system must send automatic notifications to EV Drivers when their reserved charger becomes unavailable due to maintenance or faults.

### REQ 2.6 - Harita Otomatik Guncelleme (F | E)
When a charger status changes (e.g., to Offline), the map must automatically update the station's color-coded marker to reflect the new status. **Sinif duzeltmesi: NF -> F**

### REQ 2.7 - Performans Metrikleri (F | E)
Station Operators should be able to view performance metrics for their stations, including utilization rates, average session durations, and revenue.

### REQ 2.8 - Genel Bakis Dashboard (F | E)
Station Operators must have access to a dashboard showing an overview of all their stations, charger statuses, and active sessions.

### REQ 2.9 - Oturum Mudehalesi (F | E)
Station Operators should be able to remotely intervene in active charging sessions (e.g., emergency stop) when necessary.

### REQ 2.10 - Yeni Istasyon Ekleme (F | E)
Station Operators must be able to register new stations and chargers to the network via the management interface.

### REQ 2.11 - Anlik Uyarilar (F | E)
The system must send immediate alerts (within 30 seconds of event trigger) to Station Operators for critical events such as charger faults, power outages, or safety issues.

### REQ 2.12 - Coklu Istasyon Yonetimi (F | E)
Station Operators must be able to manage multiple stations from a single account, with the ability to switch between stations.

### REQ 2.13 - Is Saatleri Tanimlama (F | E)
Station Operators should be able to set operating hours for each station. Default: Hafta ici 09:00-18:00 (yerel saat). Operator ozel saat tanimlayabilir.

### REQ 2.14 - Fiyat Guncelleme (F | V)
Station Operators must be able to update the pricing (TL/kWh) for each charger at their stations.

---

## VP3: System Administrator (14 REQ)

### REQ 3.1 - Kullanici Yonetimi (F | E)
System Administrators must be able to manage user accounts, including creating, modifying, and deactivating EV Driver and Station Operator accounts.

### REQ 3.2 - Rol Tabani Erisim Kontrolu (F | E)
The system must enforce role-based access control (RBAC) to ensure users can only access features appropriate to their role (EV Driver, Station Operator, System Administrator).

### REQ 3.3 - Global Konfigarasyon (F | E)
System Administrators must be able to configure system-wide settings (pricing policies, commission rates, etc.). Changes shall be applied simultaneously across all stations, completing within a maximum of 5 minutes.

### REQ 3.4 - Sistem Sagligi Izleme (F | E)
System Administrators must have access to a real-time system health dashboard showing server status, API response times, and error rates.

### REQ 3.5 - Otomatik Rapor Uretimi (F | E)
The system should generate automated reports on usage statistics, revenue, and operational metrics on a scheduled basis (daily, weekly, monthly).

### REQ 3.6 - API Limitleme (NF | E)
The system should implement API rate limiting to prevent abuse and ensure fair usage of system resources.

### REQ 3.7 - Veritabani Yedekleme (NF | E)
The system must perform automated database backups at regular intervals to ensure data recovery in case of failure.

### REQ 3.8 - Denetim Izi (Audit Trail) (F | E)
The system must maintain an audit trail of all administrative actions, including user modifications, configuration changes, and access attempts.

### REQ 3.9 - Sistem Parametreleri Yonetimi (F | E)
System Administrators must be able to adjust system parameters such as maximum session duration, cancellation penalties, low balance thresholds, and notification settings.

### REQ 3.10 - Toplu Islem (F | E)
System Administrators should be able to perform bulk operations on stations or chargers, such as mass status updates or pricing changes.

### REQ 3.11 - Kullanici Aktivite Izleme (F | E)
System Administrators should be able to monitor user activity patterns and detect anomalies or suspicious behavior.

### REQ 3.12 - Acil Sistem Kapatma (F | E)
System Administrators must have the ability to perform an emergency shutdown of individual stations or the entire network when critical safety issues arise.

### REQ 3.13 - Eski Veri Arsivleme (NF | E)
The system should support archiving of old data (completed sessions, expired reservations) to maintain database performance.

### REQ 3.14 - Sistem Guncelleme Yonetimi (NF | E)
System Administrators should be able to schedule and manage system updates with minimal downtime.

---

## VP4: Map Service Providers (9 REQ)

### REQ 5.1 - Harita Entegrasyonu (F | E)
The system must integrate with Google Maps API to display charging station locations on an interactive map.

### REQ 5.2 - Gercek Zamanli Konum (F | E)
The system must utilize the user's real-time GPS location to provide relevant nearby station recommendations.

### REQ 5.3 - Rota Hesaplama (F | E)
The system must calculate optimal routes from the driver's location to the selected charging station using the Directions API.

### REQ 5.4 - Trafik Bilgisi (F | E)
The system should incorporate real-time traffic data to provide accurate ETA calculations.

### REQ 5.5 - Harita Onbellekleme (NF | E)
The application should cache map tiles and station data locally to reduce API calls and improve performance.

### REQ 5.6 - Alternatif Rota (F | E)
The system should suggest alternative charging stations along the route if the preferred station is unavailable.

### REQ 5.7 - Geocoding (F | E)
The system must support address-based search for charging stations using geocoding services.

### REQ 5.8 - Harita Guncelleme Frekansi (NF | V)
Station availability data on the map must be refreshed at least every 30 seconds to ensure accuracy.

### REQ 5.9 - Coklu Platform Harita (NF | E)
The map interface must function correctly across different screen sizes (mobile, tablet, desktop) with responsive design.

---

## VP5: Payment Service Providers (8 REQ)

### REQ 4.1 - Cuzdan Sistemi (F | E)
The system must provide a digital wallet for each EV Driver to manage charging payments. Drivers must be able to top up their wallet balance.

### REQ 4.2 - Yuksek Erisilebilirlik (NF | E)
The payment processing system must maintain high availability with a target of 99.5% uptime (maximum 3.6 hours downtime per month).

### REQ 4.3 - Islem Kaydi (F | E)
The system must maintain a detailed transaction log for all wallet operations (top-up, charge, refund) for audit purposes.

### REQ 4.4 - Otomatik Odeme (F | E)
Upon completion of a charging session, the system must automatically calculate the total cost and deduct it from the driver's wallet.

### REQ 4.5 - Islem Guvenlik Sifreleme (NF | E)
All payment transactions must be encrypted using industry-standard protocols (TLS 1.2 or higher) to protect financial data.

### REQ 4.6 - Iade Mekanizmasi (F | E)
The system must support automated refund processing for cancelled reservations or billing errors, with refunds credited to the user's wallet.

### REQ 4.7 - Bakiye Yetersizligi Kontrolu (F | E)
The system must verify sufficient wallet balance before allowing a reservation or charging session to begin.

### REQ 4.8 - Dijital Makbuz Uretimi (F | E)
The system must generate digital receipts for all completed charging transactions, including energy consumed, unit price, total cost, and session details.

---

## VP6: Electric Grid Providers (7 REQ)

### REQ 6.1 - Enerji Tuketimi Izleme (F | E)
The system must track and record the total energy consumption (kWh) for each charging session for grid reporting purposes.

### REQ 6.2 - Yuk Dengeleme Bilgisi (F | E)
The system should provide aggregated charging load data to grid operators to facilitate demand-side management.

### REQ 6.3 - Maksimum Kapasite Siniri (D | E)
Each charging station must enforce a maximum simultaneous charging capacity (total kW) to prevent grid overload.

### REQ 6.4 - Peak Load Uyarisi (F | V)
The system must generate a peak load warning when active charging sessions at a station reach 80% of total capacity.

### REQ 6.5 - Enerji Kaynak Raporlama (F | E)
The system should track and report the energy source mix (renewable vs. conventional) for each station if available.

### REQ 6.6 - Zaman Bazli Enerji Raporlama (F | E)
The system must generate time-based energy consumption reports (hourly, daily, monthly) for grid planning purposes.

### REQ 6.7 - Guvenli Calisma Esikleri (D | E)
Guvenli calisma esikleri (voltaj/akim/sicaklik limitleri) Station Operator tarafindan charger bazinda DB'de tanimlanir. Sistem bu degerleri izler ve asim durumunda otomatik uyari uretir. **Sinif duzeltmesi: NF (Safety) -> D**

---

## VP7: Charging Standards (4 REQ)

### REQ 7.1 - Konnektor Tipi Destegi (D | E)
The system must support multiple EV charging connector types: CCS (Combined Charging System), CHAdeMO, and Type 2 (IEC 62196).

### REQ 7.2 - Uyumluluk Kontrolu (D | E)
Aracin connector_type (CCS/CHAdeMO/Type2) ile Charger'in connector_type birebir eslesmelidir. Eslesmeme durumunda rezervasyon reddedilir ve kullaniciya "X ile Y uyumsuz" mesaji gosterilir.

### REQ 7.3 - Guc Dogrulama (D | E)
The system must verify that the charger's power output is compatible with the vehicle's maximum charging rate to prevent damage.

### REQ 7.4 - Sarj Protokolu Uyumu (D | E)
The system must ensure compliance with relevant charging protocols and safety standards for each connector type.

---

## VP8: Communication Protocols (5 REQ)

### REQ 8.1 - OCPP Destegi (D | E)
The system must support OCPP (Open Charge Point Protocol) for communication between the central management system and charging stations.

### REQ 8.2 - Gercek Zamanli Veri Aktarimi (NF | E)
The system must support real-time data transmission between chargers and the central system with a maximum latency of 5 seconds.

### REQ 8.3 - Baglanti Kopma Yonetimi (NF | E)
The system must handle communication failures gracefully, maintaining the last known charger status and attempting automatic reconnection.

### REQ 8.4 - Guvenli Iletisim (NF | E)
All communication between chargers and the central system must be encrypted and authenticated to prevent unauthorized access.

### REQ 8.5 - Firmware Guncelleme (F | E)
The system should support over-the-air firmware updates for charging stations through the OCPP protocol.

---

## VP9: Privacy & Security Regulations (7 REQ)

### REQ 9.1 - Kisisel Veri Koruma (NF | E)
The system must comply with KVKK (Turkish Personal Data Protection Law) and GDPR regulations for handling personal data.

### REQ 9.2 - Veri Sifreleme (NF | E)
All sensitive user data (passwords, payment information) must be encrypted at rest using AES-256 and in transit using TLS 1.2+.

### REQ 9.3 - Erisim Denetimi Kaydi (F | E)
The system must log all access attempts (successful and failed) with timestamps, user IDs, and IP addresses for security auditing.

### REQ 9.4 - Oturum Yonetimi (NF | E)
User sessions must be managed securely with automatic timeout after a configurable period of inactivity.

### REQ 9.5 - Veri Silme Hakki (F | E)
The system must support the right to be forgotten, allowing users to request complete deletion of their personal data.

### REQ 9.6 - Veri Saklama Politikasi (NF | E)
The system's data retention policies must be configurable to adapt to future updates or changes in local and international regulations.
**AMENDMENT:** The default log retention period shall be 365 days (1 year). System Administrators may adjust this period via the admin dashboard. Logs older than the retention period shall be automatically archived or purged on a weekly scheduled task.

### REQ 9.7 - Erisilebirlirlik / Accessibility (NF | E) [YENI]
The system's web interface must conform to WCAG 2.1 Level AA accessibility guidelines, including sufficient color contrast ratios (minimum 4.5:1 for normal text), keyboard navigation support, and screen reader compatibility for all core user flows (registration, reservation, charging, payment).

---

## Ozet Tablo

| Viewpoint | REQ Sayisi | Functional | Non-Functional | Domain |
|-----------|-----------|------------|----------------|--------|
| EV Driver | 22 | 20 | 1 | 1 |
| Station Operator | 14 | 14 | 0 | 0 |
| System Administrator | 14 | 10 | 4 | 0 |
| Map Service Providers | 9 | 6 | 3 | 0 |
| Payment Service Providers | 8 | 6 | 2 | 0 |
| Electric Grid Providers | 7 | 5 | 0 | 2 |
| Charging Standards | 4 | 0 | 0 | 4 |
| Communication Protocols | 5 | 1 | 4 | 0 |
| Privacy & Security | 7 | 2 | 5 | 0 |
| **TOPLAM** | **90** | **64** | **19** | **7** |

---

## Degisiklik Gecmisi

### Part 1 Geri Donus Duzeltmeleri (Nisan 2026)
- **8 yeni REQ eklendi:** 1.16, 1.17, 1.18, 1.19, 1.20, 1.21, 1.22, 9.7
- **4 REQ amend edildi:** 1.9, 1.15, 2.4, 9.6
- **2 sinif duzeltmesi:** REQ 2.6 (NF->F), REQ 6.7 (NF->D)
- **10 belirsizlik giderildi:** REQ 1.3, 1.5, 1.13, 2.11, 2.13, 3.3, 4.2, 6.4, 6.7, 7.2
- **Toplam:** 82 -> 90 REQ
