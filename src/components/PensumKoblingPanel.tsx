"use client";

import { useState } from "react";
import type { PensumKobling } from "@/lib/pensumKoblinger";

/**
 * Renders the teacher's separately-generated pensum mapping for an
 * article — deliberately styled differently from ConceptBadges (dashed
 * gold border instead of the accent-colored badges) so the two systems
 * read as visually distinct while both exist on the same card. Per her
 * explicit request: the academic assessment is kept out of the news
 * summary's own text, and "opphav" (machine-generated) is always shown.
 */
export function PensumKoblingPanel({ kobling }: { kobling: PensumKobling }) {
  const [openTemaId, setOpenTemaId] = useState<string | null>(null);
  const openTema = kobling.temaer.find(
    (t, i) => `${t.tema_id}-${i}` === openTemaId,
  );

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="mt-4 rounded-lg border-2 border-dashed border-gold/50 bg-gold/5 p-3.5"
    >
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <p className="text-xs font-bold uppercase tracking-wide text-gold">Pensumkobling</p>
        <p className="text-[0.65rem] italic text-muted">{kobling.opphav}</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {kobling.temaer.map((t, i) => {
          const id = `${t.tema_id}-${i}`;
          const isOpen = openTemaId === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setOpenTemaId(isOpen ? null : id)}
              aria-expanded={isOpen}
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.7rem] font-medium transition-colors cursor-pointer ${
                isOpen
                  ? "border-gold bg-gold text-accent-foreground"
                  : "border-gold/40 bg-gold/10 text-gold hover:bg-gold/20"
              }`}
            >
              {t.tema} · {t.emne} uke {t.uke}
            </button>
          );
        })}
      </div>

      {openTema && (
        <div className="mt-2 rounded-md border border-gold/30 bg-background/60 p-3">
          <p className="text-xs font-bold text-foreground mb-1">{openTema.tema}</p>
          <p className="text-xs text-foreground/70 mb-1.5">
            {openTema.emne}, uke {openTema.uke} · {openTema.kilde_pensum} · styrke:{" "}
            {openTema.styrke}
          </p>
          <p className="text-xs leading-relaxed text-foreground/80">{openTema.begrunnelse}</p>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gold/20">
        <p className="text-xs font-semibold text-foreground mb-1.5">
          Faglig vurdering <span className="font-normal text-muted">(maskingenerert)</span>
        </p>
        <dl className="text-xs leading-relaxed text-foreground/80 space-y-1">
          <div>
            <dt className="inline font-medium text-foreground/90">Fenomen: </dt>
            <dd className="inline">{kobling.faglig_vurdering.fenomen}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-foreground/90">Modell: </dt>
            <dd className="inline">{kobling.faglig_vurdering.modell}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-foreground/90">Tallfestbart: </dt>
            <dd className="inline">{kobling.faglig_vurdering.tallfestbart}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-foreground/90">Mangler: </dt>
            <dd className="inline">{kobling.faglig_vurdering.mangler}</dd>
          </div>
        </dl>
      </div>

      {kobling.kildekritikk.forbehold && (
        <p className="mt-2 text-xs italic text-muted">
          Kildekritikk ({kobling.kildekritikk.type}): {kobling.kildekritikk.forbehold}
        </p>
      )}
    </div>
  );
}
