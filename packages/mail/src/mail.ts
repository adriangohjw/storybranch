export interface MailMessage {
  subject: string;
  text: string;
  to: string;
}

export interface MailerOptions {
  apiKey: string | undefined;
  dangerousLog?: boolean;
  fetchFn?: typeof fetch;
  from: string | undefined;
  log?: (line: string) => void;
}

export interface Mailer {
  send: (message: MailMessage) => Promise<void>;
}

export function createMailer(options: MailerOptions): Mailer {
  const log = options.log ?? console.info;
  const fetchFn = options.fetchFn ?? fetch;

  return {
    async send(message) {
      if (options.dangerousLog === true) {
        log(`storybranch email to ${message.to}: ${message.text}`);

        return;
      }

      const { apiKey, from } = options;

      if (apiKey === undefined || from === undefined) {
        throw new Error(
          "Resend needs an API key and from address, or enable dangerousLog"
        );
      }

      const response = await fetchFn("https://api.resend.com/emails", {
        body: JSON.stringify({
          from,
          subject: message.subject,
          text: message.text,
          to: message.to,
        }),
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        const detail = await response.text();

        throw new Error(
          `Resend returned ${response.status}${detail === "" ? "" : `: ${detail}`}`
        );
      }
    },
  };
}
