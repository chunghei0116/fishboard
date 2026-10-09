"use client";
import { useEffect, useId, useRef, useState } from "react";
import { MapPin, LoaderCircle, Check } from "lucide-react";
import type { Place } from "@/lib/place-search";

export function LocationInput() {
  const id = useId();
  const [value, setValue] = useState("");
  const [selected, setSelected] = useState<Place | null>(null);
  const [result, setResult] = useState<{
    query: string;
    places: Place[];
    error?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [composing, setComposing] = useState(false);
  const [active, setActive] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  const field = useRef<HTMLDivElement>(null);
  const q = value.trim().replace(/\s+/g, " ");
  const places = result?.query === q ? result.places : [];
  const open = focused && !selected && !composing && q.length >= 2;

  useEffect(() => {
    // Safari touch taps can blur the input with a null relatedTarget before
    // delivering click. Close only on a real interaction outside this field.
    function outside(event: Event) {
      if (
        event.target instanceof Node &&
        !field.current?.contains(event.target)
      ) {
        setFocused(false);
        setLoading(false);
        setActive(-1);
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
    };
  }, []);

  useEffect(() => {
    if (selected || composing || !focused || q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/places?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        const body = (await response.json()) as {
          error?: string;
          places?: Place[];
        };
        if (!response.ok)
          throw new Error(body.error || "暫時未能搜尋，可直接輸入地點。");
        if (!Array.isArray(body.places))
          throw new Error("暫時未能搜尋，可直接輸入地點。");
        if (!controller.signal.aborted)
          setResult({ query: q, places: body.places });
      } catch (error) {
        if (!controller.signal.aborted)
          setResult({
            query: q,
            places: [],
            error:
              error instanceof Error
                ? error.message
                : "暫時未能搜尋，可直接輸入地點。",
          });
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 600);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, selected, composing, focused]);

  function choose(place: Place) {
    setSelected(place);
    setValue(place.name);
    setResult(null);
    setLoading(false);
    setActive(-1);
    input.current?.focus();
  }
  return (
    <div ref={field} className="fl-wide fl-location-field">
      <label htmlFor={id}>地點</label>
      <div className="fl-location-control">
        <MapPin size={16} aria-hidden="true" />
        <input
          ref={input}
          id={id}
          name="location"
          required
          maxLength={160}
          value={value}
          placeholder="輸入地點，例如 長沙灣"
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && places.length > 0}
          aria-controls={open && places.length ? `${id}-list` : undefined}
          aria-activedescendant={
            open && active >= 0 && places[active]
              ? `${id}-${active}`
              : undefined
          }
          onFocus={() => setFocused(true)}
          onCompositionStart={() => {
            setComposing(true);
            setLoading(false);
          }}
          onCompositionEnd={() => setComposing(false)}
          onChange={(event) => {
            setValue(event.target.value);
            setSelected(null);
            setResult(null);
            setActive(-1);
            setLoading(false);
            setFocused(true);
          }}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing || composing) return;
            if (event.key === "Escape" && open) {
              event.preventDefault();
              event.stopPropagation();
              setFocused(false);
              setLoading(false);
            }
            if (
              open &&
              places.length &&
              (event.key === "ArrowDown" || event.key === "ArrowUp")
            ) {
              event.preventDefault();
              setActive((n) =>
                event.key === "ArrowDown"
                  ? (n + 1) % places.length
                  : n <= 0
                    ? places.length - 1
                    : n - 1,
              );
            }
            if (
              event.key === "Enter" &&
              open &&
              active >= 0 &&
              places[active]
            ) {
              event.preventDefault();
              choose(places[active]);
            }
          }}
        />
        {selected && (
          <Check
            size={16}
            className="fl-location-check"
            aria-label="已選取地點"
          />
        )}
      </div>
      <input type="hidden" name="latitude" value={selected?.latitude ?? ""} />
      <input type="hidden" name="longitude" value={selected?.longitude ?? ""} />
      {open && (
        <div className="fl-place-panel">
          {places.length > 0 && (
            <ul id={`${id}-list`} role="listbox" aria-label="地點建議">
              {places.map((place, index) => (
                <li key={place.id} role="presentation">
                  <button
                    id={`${id}-${index}`}
                    type="button"
                    role="option"
                    aria-selected={active === index}
                    onPointerDown={(event) => {
                      if (event.pointerType === "mouse") event.preventDefault();
                    }}
                    onClick={() => choose(place)}
                  >
                    <MapPin size={15} aria-hidden="true" />
                    <span>
                      <b>{place.name}</b>
                      <small>
                        {[place.district, place.address]
                          .filter(Boolean)
                          .join(" · ") || place.englishName}
                      </small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="fl-place-status" role="status" aria-live="polite">
            {loading ? (
              <>
                <LoaderCircle size={14} className="fl-place-spinner" />
                搜尋中…
              </>
            ) : result?.query === q ? (
              result.error ||
              (places.length
                ? `${places.length} 個地點建議`
                : "未找到建議，可直接輸入地點。")
            ) : (
              "停頓片刻即可搜尋地點"
            )}
          </div>
          <a
            className="fl-place-source"
            href="https://portal.csdi.gov.hk/csdi-webpage/apidoc/LocationSearchAPI"
            target="_blank"
            rel="noreferrer"
          >
            地點資料 © 香港特別行政區政府 · CSDI
          </a>
        </div>
      )}
    </div>
  );
}
