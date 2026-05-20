(async () => {
  console.clear();

  const endpoint = "/api/activity/debug/free-text-value-object-test";
  const suiteId = `C8-P3-B6-${Date.now()}`;

  const cases = [
    {
      name: "CASE 1 — no flag regression",
      payload: {
        inputText: "walked to work for 15 minutes",
        durationMinutes: 15,
        title: `Walked to work — ${suiteId} no flag`,
        description:
          "P4.10.0-C8-P3-B6 no-flag regression after route additionalCategoryLinks integration",
      },
      expectations: {
        categoryDerivationEnabled: false,
        expectAdditionalLinks: false,
      },
    },
    {
      name: "CASE 2 — Category Derivation dryRun=true",
      payload: {
        inputText: "walked to work for 15 minutes",
        durationMinutes: 15,
        title: `Walked to work — ${suiteId} dryRun`,
        description:
          "P4.10.0-C8-P3-B6 Category Derivation dryRun regression",
        enableCategoryDerivation: true,
        categoryDerivationDryRun: true,
        categoryDerivationCreatePolicy: "suggested_only",
      },
      expectations: {
        categoryDerivationEnabled: true,
        expectAdditionalLinks: false,
      },
    },
    {
      name: "CASE 3 — Category Derivation dryRun=false",
      payload: {
        inputText: "walked to work for 15 minutes",
        durationMinutes: 15,
        title: `Walked to work — ${suiteId} non-dryRun`,
        description:
          "P4.10.0-C8-P3-B6 Category Derivation non-dryRun route-to-bridge integration",
        enableCategoryDerivation: true,
        categoryDerivationDryRun: false,
        categoryDerivationCreatePolicy: "suggested_only",
      },
      expectations: {
        categoryDerivationEnabled: true,
        expectAdditionalLinks: true,
      },
    },
  ];

  function isObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  function collectBridgeLikeObjects(value, path = "root", output = []) {
    if (!isObject(value)) {
      return output;
    }

    if (Array.isArray(value.created)) {
      const looksLikeBridge =
        "mappingsRequested" in value ||
        "eventId" in value ||
        value.created.some(
          (item) =>
            isObject(item) &&
            ("valueObjectId" in item ||
              "valueObjectInstanceId" in item ||
              "activityEventValueObjectLinkId" in item)
        );

      if (looksLikeBridge) {
        output.push({ path, value });
      }
    }

    for (const [key, child] of Object.entries(value)) {
      if (isObject(child)) {
        collectBridgeLikeObjects(child, `${path}.${key}`, output);
      } else if (Array.isArray(child)) {
        child.forEach((item, index) => {
          if (isObject(item)) {
            collectBridgeLikeObjects(item, `${path}.${key}[${index}]`, output);
          }
        });
      }
    }

    return output;
  }

  function extractCreatedItems(bridgeLikeObjects) {
    return bridgeLikeObjects.flatMap((entry) =>
      Array.isArray(entry.value.created) ? entry.value.created : []
    );
  }

  function getCategoryDerivationObject(data) {
    if (isObject(data?.categoryDerivation)) return data.categoryDerivation;
    if (isObject(data?.debug?.categoryDerivation)) return data.debug.categoryDerivation;
    if (isObject(data?.categoryDerivationResult)) return data.categoryDerivationResult;
    return null;
  }

  function countAdditionalLinks(createdItems) {
    return createdItems.reduce((sum, item) => {
      if (!isObject(item)) return sum;
      if (!Array.isArray(item.additionalValueObjectCategoryLinks)) return sum;
      return sum + item.additionalValueObjectCategoryLinks.length;
    }, 0);
  }

  function countAdditionalErrors(createdItems) {
    return createdItems.reduce((sum, item) => {
      if (!isObject(item)) return sum;
      if (!Array.isArray(item.additionalValueObjectCategoryLinkErrors)) return sum;
      return sum + item.additionalValueObjectCategoryLinkErrors.length;
    }, 0);
  }

  async function runCase(testCase) {
    console.log("");
    console.log("============================================================");
    console.log(testCase.name);
    console.log("============================================================");
    console.log("Endpoint:", endpoint);
    console.log("Payload:", testCase.payload);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(testCase.payload),
    });

    const contentType = response.headers.get("content-type") || "";
    const rawText = await response.text();

    let data = null;
    let parseError = null;

    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch (error) {
      parseError = error instanceof Error ? error.message : String(error);
    }

    console.log("");
    console.log("HTTP status:", response.status);
    console.log("Content-Type:", contentType);

    if (parseError) {
      console.error("JSON parse error:", parseError);
      console.log("Raw response:", rawText);
      return {
        name: testCase.name,
        checks: {
          http200: response.status === 200,
          validJson: false,
        },
        failedChecks: ["validJson"],
        data: null,
      };
    }

    console.log("");
    console.log("Raw response:");
    console.log(JSON.stringify(data, null, 2));

    const bridgeLikeObjects = collectBridgeLikeObjects(data);
    const createdItems = extractCreatedItems(bridgeLikeObjects);
    const categoryDerivation = getCategoryDerivationObject(data);

    const additionalLinksCount = countAdditionalLinks(createdItems);
    const additionalErrorsCount = countAdditionalErrors(createdItems);

    const categoryDerivationEnabledActual =
      categoryDerivation?.enabled === true ||
      categoryDerivation?.options?.enabled === true;

    const additionalFieldsVisible =
      createdItems.length > 0 &&
      createdItems.every(
        (item) =>
          isObject(item) &&
          Array.isArray(item.additionalValueObjectCategoryLinks) &&
          Array.isArray(item.additionalValueObjectCategoryLinkErrors)
      );

    const checks = {
      http200: response.status === 200,
      responseOkTrue: data?.ok === true,
      validJson: data !== null && parseError === null,
      statusCreatedAndBridgeProcessed:
        data?.status === "created_and_bridge_processed",
      bridgeLikeObjectFound: bridgeLikeObjects.length > 0,
      createdItemsPositive: createdItems.length > 0,
      additionalFieldsVisible,
      additionalErrorsEmpty: additionalErrorsCount === 0,
      categoryDerivationExpectation:
        categoryDerivationEnabledActual ===
        testCase.expectations.categoryDerivationEnabled,
      additionalLinksExpectation: testCase.expectations.expectAdditionalLinks
        ? additionalLinksCount > 0
        : additionalLinksCount === 0,
    };

    console.log("");
    console.log("Bridge-like objects:");
    console.table(
      bridgeLikeObjects.map((entry) => ({
        path: entry.path,
        createdCount: Array.isArray(entry.value.created)
          ? entry.value.created.length
          : null,
        ok: entry.value.ok,
        skipped: entry.value.skipped,
        mappingsRequested: entry.value.mappingsRequested,
      }))
    );

    console.log("");
    console.log("Checks:");
    console.table(checks);

    console.log("");
    console.log("Important values:");
    console.log({
      suiteId,
      caseName: testCase.name,
      eventId: data?.eventId ?? data?.activityEvent?.id ?? data?.event?.id ?? null,
      status: data?.status ?? null,
      bridgeLikeObjectPaths: bridgeLikeObjects.map((entry) => entry.path),
      createdItemsCount: createdItems.length,
      additionalLinksCount,
      additionalErrorsCount,
      categoryDerivation,
    });

    const failedChecks = Object.entries(checks)
      .filter(([, value]) => value !== true)
      .map(([key]) => key);

    if (failedChecks.length === 0) {
      console.log(`RESULT: PASS — ${testCase.name}`);
    } else {
      console.warn(`RESULT: PARTIAL/FAIL — ${testCase.name}`);
      console.warn("Failed checks:", failedChecks);
    }

    return {
      name: testCase.name,
      checks,
      failedChecks,
      importantValues: {
        eventId: data?.eventId ?? data?.activityEvent?.id ?? data?.event?.id ?? null,
        status: data?.status ?? null,
        createdItemsCount: createdItems.length,
        additionalLinksCount,
        additionalErrorsCount,
        categoryDerivationEnabledActual,
      },
      data,
    };
  }

  const results = [];

  for (const testCase of cases) {
    results.push(await runCase(testCase));
  }

  const suiteFailed = results.flatMap((result) =>
    result.failedChecks.map((check) => `${result.name}: ${check}`)
  );

  console.log("");
  console.log("============================================================");
  console.log("SUITE SUMMARY — P4.10.0-C8-P3-B6");
  console.log("============================================================");
  console.table(
    results.map((result) => ({
      case: result.name,
      failedChecks: result.failedChecks.length,
      eventId: result.importantValues?.eventId ?? null,
      status: result.importantValues?.status ?? null,
      createdItemsCount: result.importantValues?.createdItemsCount ?? null,
      additionalLinksCount: result.importantValues?.additionalLinksCount ?? null,
      additionalErrorsCount: result.importantValues?.additionalErrorsCount ?? null,
      categoryDerivationEnabledActual:
        result.importantValues?.categoryDerivationEnabledActual ?? null,
    }))
  );

  if (suiteFailed.length === 0) {
    console.log("SUITE RESULT: PASS — C8-P3-B6 route integration regression suite passed.");
  } else {
    console.warn("SUITE RESULT: PARTIAL/FAIL");
    console.warn("Failed checks:", suiteFailed);
  }
})();