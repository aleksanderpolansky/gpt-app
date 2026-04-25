"use client";

import { useEffect, useState } from "react";

type Business = {
  id: string;
  organization_name: string;
  organization_type: string;
  description?: string | null;
  status: string;
  created_at: string;
};

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadBusinesses() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/organizations");
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Ошибка загрузки предприятий.");
        return;
      }

      setBusinesses(data.organizations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadBusinesses();
  }, []);

  return (
    <main className="min-h-screen bg-white text-black px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-3xl font-bold mb-6 text-center">
          Мои предприятия
        </h1>

        <div className="mb-6 flex justify-center gap-4">
          <a href="/" className="text-blue-600 underline">
            На главную
          </a>

          <a href="/businesses/new" className="text-blue-600 underline">
            Создать предприятие
          </a>
        </div>

        {isLoading && (
          <div className="border rounded p-4 bg-gray-50">
            Загружаю предприятия...
          </div>
        )}

        {error && (
          <div className="border rounded p-4 bg-red-50 text-red-700">
            {error}
          </div>
        )}

        {!isLoading && !error && businesses.length === 0 && (
          <div className="border rounded p-4 bg-yellow-50">
            У тебя пока нет предприятий.
          </div>
        )}

        {!isLoading && !error && businesses.length > 0 && (
          <div className="space-y-4">
            {businesses.map((business) => (
              <div key={business.id} className="border rounded p-4 bg-gray-50">
                <h2 className="text-xl font-semibold">
                  {business.organization_name}
                </h2>

                <p className="mt-1">
                  <span className="font-semibold">Тип:</span>{" "}
                  {business.organization_type}
                </p>

                <p>
                  <span className="font-semibold">Статус:</span>{" "}
                  {business.status}
                </p>

                {business.description && (
                  <p className="mt-2">
                    <span className="font-semibold">Описание:</span>{" "}
                    {business.description}
                  </p>
                )}

                <p className="mt-2 text-sm text-gray-600">
                  ID: {business.id}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}