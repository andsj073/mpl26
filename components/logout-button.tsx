"use client";

/** Loggar ut enheten: rensar auth-cookien och namnvalet, tillbaka
 *  till låssidan. Så byter man också användare på en delad telefon. */
export function LogoutButton() {
  return (
    <button
      onClick={async () => {
        await fetch("/api/logout", { method: "POST" }).catch(() => null);
        localStorage.removeItem("mpl26:name");
        location.href = "/las";
      }}
      className="text-xs text-muted-foreground underline underline-offset-2"
    >
      Logga ut
    </button>
  );
}
