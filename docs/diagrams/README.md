# PlantUML Diyagramlar

Bu klasor, projenin tum teknik diyagramlarini PlantUML kodu olarak icerir.
Render icin: https://www.plantuml.com/plantuml/uml/ veya VS Code PlantUML extension.

## Diyagram Listesi

| Dosya | Icerik | Sommerville Ref |
|-------|--------|-----------------|
| `domain_model.puml` | 16 sinifli UML domain model (rapordaki ile birebir) | Ch.5 - Structural Models |
| `er_diagram.puml` | Elmasri & Navathe EER diagram (PlantUML versiyonu) | Ch.5 |
| `er_diagram.drawio` | Elmasri & Navathe EER diagram (draw.io - PRIMARY, 22 relationship, EER generalization) | Ch.5 |
| `system_architecture.puml` | Client-Server + Layered Architecture (2 pattern birlikte) | Ch.6 - Slide 22-23 + 28-29 |
| `deployment.puml` | Client-Server deployment diagram | Ch.6 - Slide 28-29 |
| `component_frontend.puml` | Frontend component diagram (Next.js) | Ch.7 - UI Design |
| `api_endpoints.puml` | REST API endpoint haritasi (11 router, password-reset + receipts eklendi) | Ch.6 |
| `db_indexes.puml` | Database index stratejisi | - |
| `viewpoint_hierarchy.puml` | 9 viewpoint hiyerarsisi (Interactor 4 + Indirect 2 + Domain 3) | Ch.4 - RE |
| `sequence_auth_flow.puml` | Register + Login + JWT akisi | - |
| `sequence_uc1_reservation.puml` | UC1: Vehicle Reg → Station → Reserve → Route | Ch.5 - Interaction Models |
| `sequence_uc2_charging.puml` | UC2: Start → Progress → Complete → Pay → Receipt | Ch.5 |
| `sequence_uc3_maintenance.puml` | UC3: Issue → Offline → Cancel → Refund → Notify | Ch.5 |
| `state_charger.puml` | Charger state machine (Available/Occupied/Offline) | Ch.5 - Behavioral Models |
| `state_reservation.puml` | Reservation state machine (Confirmed/Cancelled/Completed) | Ch.5 |
| `state_charging_session.puml` | ChargingSession state machine (Active/Completed) | Ch.5 |
