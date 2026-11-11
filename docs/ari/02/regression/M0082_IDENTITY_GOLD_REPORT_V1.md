# M-0082 — сравнение Gold Corpus с идентичным Gold

- Сохранённый Gold Corpus SHA256: `E5073D25DEA44D91FC67A01B727C9427740FC7E5C13528281DA965DFD5A17916`; 156 сценариев. Передан **тот же файл** в параметры `--before` и `--after`.
- Контроль синтетических regression test cases: PASS (содержат PASS/FAIL/INCONCLUSIVE-ветви).
- Baseline: comparator gate **INCONCLUSIVE**, fully graded P@10 **3/10**, scoped R@20 **0**, blocking issues **0**, false regression **0**.
- Experimental: comparator gate **INCONCLUSIVE**, fully graded P@10 **0/10**, scoped R@20 **0**, blocking issues **0**, false regression **0**.
- Успех **проверки отсутствия ложного FAIL** не равен PASS качества поиска. Gold недостаточно размечен. Scope-wide Recall@20 **N/A**, независимый Gold отсутствует.
- Этот шаг не воспроизводит исправление ранжирования, не тестирует live API или Indexed Search ARI-03, не закрывает дефекты.
- Для повторения: `node scripts/tests/ari02-identical-gold-guard-v1.test.cjs --gold <private-gold-path> --output <empty-directory>`; приватный эталон не публиковать в Git.
- Следующий шаг M-0083 — контролируемое удаление exact UUID и проверка настоящего FAIL.
