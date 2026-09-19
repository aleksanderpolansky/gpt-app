# ARCTOR_CLASSIFIED_AS_RELATIONSHIP_MAP_UI_V1

Дата: 2026-09-18 19:38:00 +02:00

## Baseline

- branch: main
- HEAD before: 85f59f50903e7c8e4d3ff18ec0b214ba4c833c64
- HEAD...origin/main: 0	0

## Причина изменения

При анализе карты связей системного ОН обнаружены два архитектурных
недочёта перед введением relation type classified_as.

### 1. classified_as не имел отдельного смыслового блока

До изменения карта группировала:

- related_to + same_subject_as -> correspondence;
- supports + depends_on -> dependency/support;
- influences + conflicts_with -> influence/conflict;
- все остальные -> other.

Для системной классификации введён отдельный блок:

**Классификация и тип / Classification and type**

В нём отображаются:

- Classified as / Относится к типу;
- Has classified instances / Имеет частные проявления.

### 2. Проверка применимости использовала неправильную структурную роль

Для Global System ON:

- node_role_code = техническая роль structural;
- ontology_node_role_code = root / intermediate / leaf.

Проверка coverage и некоторые DTO использовали node_role_code там, где
relation registry ожидает ontology role.

Исправлено.

## Новое правило coverage

Relation zone создаётся только если текущий ОН разрешён registry:

- как source;
- и/или как target;

с учётом:

- allowed_source_facet_codes;
- allowed_target_facet_codes;
- allowed_source_node_roles;
- allowed_target_node_roles.

Для directed relation:

- source compatible -> outgoing zone;
- target compatible -> incoming zone.

Для symmetric relation:

- zone существует, если текущий объект допустим хотя бы на одной стороне.

## classified_as contract

Планируемый production contract:

- family = structural_crosslink;
- direction = directed;
- source role = leaf;
- target role = leaf.

Следствие:

- листовой контекстный ОН получает outgoing/incoming classification zones;
- root/intermediate ОН не получают бессмысленные красные classification zones.

## Cross-plane behavior

Связь между:

Mechanical load on the knee joint
(Systems and Structures)

и:

Mechanical load
(States and Needs)

одновременно отображается:

1. в смысловом блоке Classification and type;
2. в блоке Other primary branches для соответствующей основной ветви.

Это является ожидаемым поведением, а не дублем данных: первая зона
показывает вид связи, вторая — покрытие другой основной ветви модели.

## Локализация

Добавлены title/description для classified_as и обратной перспективы:

- EN
- RU
- PL
- UK
- DE
- ES
- CS

## DB

Этим шагом БД не изменялась.

## Validation

ESLINT_TARGETS=PASS
TYPECHECK=PASS
BUILD=PASS

## Result

PASS

## Точка продолжения

1. Если все проверки PASS — проверить diff/package.
2. Применить/проверить production migration
   ARCTOR_KNEE_MECHANICAL_LOAD_ONTOLOGY_V1_0_2.
3. Выполнить production postcheck.
4. Открыть:
   - Mechanical load on the knee joint;
   - Mechanical load;
   - Knee joint.
5. Проверить карту связей и счётчики coverage.
6. После подтверждения вернуться к Конструктору последствий Stair ascent.
