"use client";

import { useEffect, useState } from "react";

type UserProfile = {
  name?: string;
  email?: string;
  picture?: string;
};

type SyncedPerson = {
  id: string;
  full_name?: string;
  short_name?: string;
};

type SyncedActor = {
  id: string;
  actor_type: string;
  display_name: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export default function Home() {
  const [message, setMessage] = useState("");
  const [submittedMessage, setSubmittedMessage] = useState("");
  const [serverResponse, setServerResponse] = useState("Пока сервер не вызывался.");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [person, setPerson] = useState<SyncedPerson | null>(null);
  const [actor, setActor] = useState<SyncedActor | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [syncStatus, setSyncStatus] = useState("Синхронизация ещё не выполнялась.");

  async function loadMessages() {
    const response = await fetch("/api/messages");
    const data = await response.json();

    if (data.success) {
      setMessages(data.messages);
    }
  }

  async function syncUser() {
    const response = await fetch("/api/sync-user", {
      method: "POST",
    });

    const data = await response.json();

    if (!response.ok) {
      setSyncStatus(data.error || "Ошибка синхронизации пользователя.");
      return;
    }

    setPerson(data.person);
    setActor(data.actor);
    setSyncStatus("Пользователь, person и actor синхронизированы.");
  }

  useEffect(() => {
    async function loadInitialData() {
      const response = await fetch("/api/me");
      const data = await response.json();

      setUser(data.user);

      if (data.user) {
        await syncUser();
      }

      await loadMessages();
    }

    loadInitialData();
  }, []);

  async function handleSend() {
    setSubmittedMessage(message);

    const response = await fetch("/api/test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    const data = await response.json();

    setServerResponse(data.reply || data.error || "Ответ пустой.");
    setMessage("");
    await loadMessages();
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-white text-black px-4 py-10">
      <div className="w-full max-w-xl text-center">
        <h1 className="text-4xl font-bold mb-6">GPT App</h1>

        {user ? (
          <div className="mb-6 border rounded p-4 bg-gray-50">
            <p className="font-semibold">Вы вошли как:</p>
            <p>{user.name}</p>
            <p>{user.email}</p>

            <div className="mt-4 text-sm text-left border-t pt-3">
              <p className="font-semibold">Статус синхронизации:</p>
              <p>{syncStatus}</p>

              {person && (
                <p className="mt-2">
                  <span className="font-semibold">Person ID:</span> {person.id}
                </p>
              )}

              {actor && (
                <p>
                  <span className="font-semibold">Actor:</span> {actor.display_name}{" "}
                  ({actor.actor_type})
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-6 border rounded p-4 bg-gray-50">
            <p>Пользователь не вошёл.</p>
          </div>
        )}

        <div className="flex gap-3 justify-center mb-8 flex-wrap">
          <a href="/auth/login" className="bg-blue-600 text-white px-5 py-3 rounded">
            Войти
          </a>

          <a href="/auth/logout" className="bg-gray-700 text-white px-5 py-3 rounded">
            Выйти
          </a>

          <a href="/auth/profile" className="bg-green-600 text-white px-5 py-3 rounded">
            Профиль
          </a>
        </div>

        <input
          type="text"
          placeholder="Введите сообщение..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full border p-3 rounded mb-4"
        />

        <button
          onClick={handleSend}
          className="bg-black text-white px-6 py-3 rounded mb-6"
        >
          Отправить
        </button>

        <div className="border rounded p-4 text-left bg-gray-50 mb-4">
          <p className="font-semibold mb-2">Отправленное сообщение:</p>
          <p>{submittedMessage || "Пока ничего не отправлено."}</p>
        </div>

        <div className="border rounded p-4 text-left bg-gray-100 mb-4">
          <p className="font-semibold mb-2">Ответ GPT:</p>
          <pre className="whitespace-pre-wrap break-words text-sm">{serverResponse}</pre>
        </div>

        <div className="border rounded p-4 text-left bg-yellow-50">
          <p className="font-semibold mb-3">История сообщений:</p>

          {messages.length === 0 ? (
            <p>История пока пустая.</p>
          ) : (
            <div className="space-y-3">
              {messages.map((item) => (
                <div key={item.id} className="border rounded p-3 bg-white">
                  <p className="font-semibold">
                    {item.role === "user" ? "Пользователь" : "GPT"}
                  </p>
                  <p className="whitespace-pre-wrap break-words">{item.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}