"use client";

import { FormEvent, useState } from "react";

type CreateOrganizationResponse = {
  ok?: boolean;
  error?: string;
  organization?: {
    id: string;
    organization_name: string;
    organization_type: string;
    description?: string | null;
  };
  organizationActor?: {
    id: string;
    display_name: string;
    actor_type: string;
  };
  businessSpace?: {
    id: string;
    title: string;
    space_type: string;
  };
};

export default function NewBusinessPage() {
  const [organizationName, setOrganizationName] = useState("");
  const [organizationType, setOrganizationType] = useState("private_business");
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<CreateOrganizationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [debugMessage, setDebugMessage] = useState("Кнопка ещё не нажималась.");

  async function handleCreateBusiness(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setDebugMessage("Кнопка нажата. Отправляю запрос...");
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationName,
          organizationType,
          description,
        }),
      });

      const data = await response.json();
      setResult(data);

      if (!response.ok) {
        setDebugMessage("Ошибка при создании предприятия.");
        return;
      }

      setDebugMessage("Предприятие успешно создано.");

      if (data.ok) {
        setOrganizationName("");
        setDescription("");
        setOrganizationType("private_business");
      }
    } catch (error) {
      setDebugMessage("Ошибка JavaScript при отправке формы.");
      setResult({
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-black px-4 py-10">
      <div className="mx-auto w-full max-w-xl">
        <h1 className="text-3xl font-bold mb-6 text-center">
          Создать предприятие
        </h1>

        <form
          onSubmit={handleCreateBusiness}
          className="border rounded p-4 bg-gray-50 space-y-4"
        >
          <div>
            <label className="block font-semibold mb-2">
              Название предприятия
            </label>
            <input
              type="text"
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              placeholder="Например: Massage Studio Test"
              className="w-full border rounded p-3"
            />
          </div>

          <div>
            <label className="block font-semibold mb-2">
              Тип предприятия
            </label>
            <select
              value={organizationType}
              onChange={(event) => setOrganizationType(event.target.value)}
              className="w-full border rounded p-3"
            >
              <option value="private_business">Private business</option>
              <option value="employer">Employer</option>
              <option value="supplier_company">Supplier company</option>
              <option value="customer_company">Customer company</option>
              <option value="school">School</option>
              <option value="community">Community</option>
              <option value="nonprofit">Nonprofit</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-2">
              Описание
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Кратко опиши предприятие"
              className="w-full border rounded p-3 min-h-28"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || organizationName.trim().length === 0}
            className="w-full bg-black text-white rounded px-5 py-3 cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? "Создаю..." : "Создать предприятие"}
          </button>
        </form>

        <div className="mt-4 border rounded p-3 bg-blue-50">
          <p className="font-semibold">Debug:</p>
          <p>{debugMessage}</p>
        </div>

        {result && (
          <div className="mt-6 border rounded p-4 bg-yellow-50">
            <p className="font-semibold mb-2">Результат:</p>

            {result.ok ? (
              <div className="space-y-2">
                <p>Предприятие создано успешно.</p>
                <p>
                  <span className="font-semibold">Organization:</span>{" "}
                  {result.organization?.organization_name}
                </p>
                <p>
                  <span className="font-semibold">Actor:</span>{" "}
                  {result.organizationActor?.display_name} (
                  {result.organizationActor?.actor_type})
                </p>
                <p>
                  <span className="font-semibold">Business Space:</span>{" "}
                  {result.businessSpace?.title}
                </p>
              </div>
            ) : (
              <p className="text-red-600">{result.error || "Unknown error"}</p>
            )}
          </div>
        )}

        <div className="mt-6 text-center">
          <a href="/" className="text-blue-600 underline">
            На главную
          </a>
        </div>
      </div>
    </main>
  );
}