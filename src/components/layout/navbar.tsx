"use client";

import * as React from "react";
import Link from "next/link";
import { TrendingUp, Search, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function SearchInput() {
  const [query, setQuery] = React.useState("");

  return (
    <div className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search stocks (e.g., VNM, VHM, FPT)..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="pl-9 pr-4 h-9 bg-muted/50 border-none focus-visible:ring-1"
      />
    </div>
  );
}

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 0);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b transition-colors",
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-border"
          : "bg-transparent border-transparent"
      )}
    >
      <div className="container flex h-14 max-w-screen-2xl items-center mx-auto px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mr-6 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <TrendingUp className="h-4 w-4" />
          </div>
          <span className="font-semibold text-lg hidden sm:inline-block">
            VN Stock Analysis
          </span>
        </Link>

        {/* Desktop Search */}
        <div className="hidden md:flex flex-1 items-center justify-center">
          <SearchInput />
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1 ml-auto">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/market">Market</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/watchlist">Watchlist</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/screener">Screener</Link>
          </Button>
          <div className="ml-2 border-l border-border pl-2">
            <ThemeToggle />
          </div>
        </div>

        {/* Mobile Controls */}
        <div className="flex md:hidden items-center gap-1 ml-auto">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background/95 backdrop-blur-xl">
          <div className="container px-4 py-3 space-y-3 mx-auto">
            <SearchInput />
            <nav className="flex flex-col gap-1">
              <Button variant="ghost" size="sm" className="justify-start" asChild>
                <Link href="/market">Market</Link>
              </Button>
              <Button variant="ghost" size="sm" className="justify-start" asChild>
                <Link href="/watchlist">Watchlist</Link>
              </Button>
              <Button variant="ghost" size="sm" className="justify-start" asChild>
                <Link href="/screener">Screener</Link>
              </Button>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
