# GSR-1 storage compatibility gap list

Generated from the approved Global Layer v0.2 contract.

The machine ontology can be created before these are resolved, but **direct fact
routing must not be enabled** for a semantic parameter until its storage mapping
is deterministic.

## Reuse decisions

- `duration_minutes` → `duration` (**reuse**): canonical minute
- `event_count` → `observation_count` (**derived**): derive from distinct event_id; do not write synthetic 1
- `body_weight_kg` → `body_mass` (**reuse**): canonical kg
- `heart_rate_bpm` → `heart_rate` (**reuse**): canonical bpm
- `intensity_scale` → `state_score` (**reuse_guarded**): only when semantic scale is 0..10
- `qualitative_state` → `observed_text` (**reuse**): qualitative declared state
- `repetition_count` → `repetition_count` (**reuse**):
- `set_count` → `set_count` (**reuse**):
- `distance_m` → `distance` (**reuse**): canonical meter
- `external_load_kg` → `object_mass` (**reuse**): canonical kg
- `fluid_volume_ml` → `liquid_volume` (**reuse**): canonical liter with ml conversion
- `temperature_celsius` → `temperature` (**reuse**): environment temperature in v0.2
- `weather_category` → `observed_text` (**reuse**): categorical weather state
- `available_duration_minutes` → `duration` (**reuse_guarded**): safe only on context.resources.available_time

## Extensions / leaf-specific mappings required before pilot fact writes

- `blood_pressure_systolic_mmhg` (**extend**): new pressure parameter required
- `blood_pressure_diastolic_mmhg` (**extend**): new pressure parameter required
- `sleep_latency_minutes` (**extend**): must not collide with sleep duration
- `food_mass_g` (**extend**): dedicated food-mass parameter preferred
- `energy_kcal` (**leaf_specific**): resolve to energy_intake / energy_expenditure / energy_amount by leaf contract
- `caffeine_mg` (**extend**): dedicated mass parameter required
- `alcohol_g` (**extend**): dedicated alcohol mass parameter required
- `amount_money` (**leaf_specific**): resolve to currency-specific monetary parameter
- `currency_code` (**extend**): dedicated text parameter or structured measure context
- `humidity_percent` (**extend**): percentage parameter required
- `wind_speed_mps` → `speed` (**extend_unit**): add meter_per_second to allowed unit/conversion
- `cloudiness_percent` (**extend**): percentage parameter required
- `noise_level_db` (**extend**): sound-level parameter required
- `illumination_lux` (**extend**): illuminance parameter required
- `score_percent` (**extend**): percentage score parameter required
- `items_count` (**extend**): dedicated item count preferred
- `interruption_count` (**extend**): dedicated interruption count preferred
- `meal_label` (**extend**): event-local enum/text classification; not separate leaf

No missing parameter may be silently converted to `observed_text` or invented by
the model merely to make a write succeed. Unknown/missing storage contract => PROPOSE.
