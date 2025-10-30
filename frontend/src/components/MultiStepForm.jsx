import { useMemo } from "react";
import FormSection from "./FormSection.jsx";

const progressVariant = {
  1: "w-1/6",
  2: "w-2/6",
  3: "w-3/6",
  4: "w-4/6",
  5: "w-5/6",
  6: "w-full",
};

const MultiStepForm = ({
  sections,
  currentStep,
  register,
  control,
  watch,
  errors,
  onNext,
  onBack,
  onSubmit,
  isSubmitting,
}) => {
  const progressWidth = useMemo(
    () => progressVariant[currentStep] ?? "w-0",
    [currentStep]
  );

  const currentSection = sections[currentStep - 1];
  const canProceed = currentSection?.canProceed ? currentSection.canProceed() : true;

  return (
    <form
      className="space-y-8"
      onSubmit={
        currentStep === sections.length
          ? onSubmit
          : (event) => {
              event.preventDefault();
              if (!canProceed) {
                return;
              }
              onNext();
            }
      }
      noValidate
    >
      <div className="space-y-3" aria-live="polite">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-amber-600">
              Step {currentStep} of {sections.length}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">
              {currentSection.title}
            </h2>
          </div>
          <div className="text-right text-sm text-slate-600">
            {Math.round((currentStep / sections.length) * 100)}%
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-300 ${progressWidth}`}
            role="progressbar"
            aria-valuenow={currentStep}
            aria-valuemin={1}
            aria-valuemax={sections.length}
          ></div>
        </div>
      </div>

      {/* Content */}
      <FormSection title={currentSection.title}>
        {currentSection.render({
          register,
          control,
          watch,
          errors,
        })}
      </FormSection>

      {/* Navigation Buttons */}
      <div className="flex gap-4">
        {currentStep > 1 && (
          <button
            type="button"
            onClick={onBack}
            className="flex-1 rounded-lg border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            Back
          </button>
        )}
        <button
          type="submit"
          disabled={
            isSubmitting ||
            (currentStep !== sections.length && !canProceed)
          }
          className={`flex-1 rounded-lg px-6 py-3 font-medium text-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-amber-400 ${
            isSubmitting ||
            (currentStep !== sections.length && !canProceed)
              ? "bg-amber-400 cursor-not-allowed opacity-60"
              : "bg-amber-500 hover:bg-amber-600"
          }`}
        >
          {isSubmitting
            ? "Processing..."
            : currentStep === sections.length
            ? "Submit"
            : "Next"}
        </button>
      </div>
    </form>
  );
};

export default MultiStepForm;