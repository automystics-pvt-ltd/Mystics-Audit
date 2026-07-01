import { useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getCountries, getStates, getCities, hasStates } from "@/lib/location-data";
import { cn } from "@/lib/utils";

interface LocationSelectorProps {
  country: string;
  state: string;
  city: string;
  onCountryChange: (v: string) => void;
  onStateChange:  (v: string) => void;
  onCityChange:   (v: string) => void;
  required?: boolean;
  errors?: { country?: string; state?: string; city?: string };
  className?: string;
  layout?: "grid" | "column";
}

const COUNTRIES = getCountries();

export function LocationSelector({
  country, state, city,
  onCountryChange, onStateChange, onCityChange,
  required, errors, className, layout = "grid",
}: LocationSelectorProps) {
  const states = country ? getStates(country) : [];
  const showState = country ? hasStates(country) : true;
  const cities = country ? getCities(country, showState ? state : "") : [];

  /* Reset downstream when parent changes */
  useEffect(() => {
    if (state && !states.includes(state)) { onStateChange(""); onCityChange(""); }
  }, [country]);

  useEffect(() => {
    if (city && !cities.includes(city)) onCityChange("");
  }, [state]);

  const wrapper = layout === "grid"
    ? "grid grid-cols-1 sm:grid-cols-3 gap-4"
    : "space-y-4";

  return (
    <div className={cn(wrapper, className)}>
      {/* Country */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Country{required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        <Select value={country} onValueChange={v => { onCountryChange(v); onStateChange(""); onCityChange(""); }}>
          <SelectTrigger className={cn("h-9", errors?.country && "border-destructive focus:ring-destructive")}>
            <SelectValue placeholder="Select country" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        {errors?.country && <p className="text-xs text-destructive">{errors.country}</p>}
      </div>

      {/* State / Province */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          {showState ? "State / Province" : "State / Province"}
          {required && showState && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        <Select
          value={state}
          onValueChange={v => { onStateChange(v); onCityChange(""); }}
          disabled={!country || !showState}>
          <SelectTrigger className={cn("h-9", errors?.state && "border-destructive focus:ring-destructive", (!country || !showState) && "opacity-50")}>
            <SelectValue placeholder={!country ? "Select country first" : !showState ? "Not applicable" : "Select state"} />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        {errors?.state && <p className="text-xs text-destructive">{errors.state}</p>}
      </div>

      {/* City */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">City</Label>
        <Select
          value={city}
          onValueChange={onCityChange}
          disabled={!country || (showState && !state)}>
          <SelectTrigger className={cn("h-9", errors?.city && "border-destructive", (!country || (showState && !state)) && "opacity-50")}>
            <SelectValue placeholder={!country ? "Select country first" : showState && !state ? "Select state first" : "Select city"} />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        {errors?.city && <p className="text-xs text-destructive">{errors.city}</p>}
      </div>
    </div>
  );
}
