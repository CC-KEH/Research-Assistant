import { AlertCircleIcon, CheckCircle2Icon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function AlertBox(props: any) {
  return (
    <div className="grid w-full max-w-xl items-start gap-4">
      <Alert variant={props.alert_variant}>
        {props.alert_variant === "destructive" ? (
          <AlertCircleIcon />
        ) : (
          <CheckCircle2Icon />
        )}
        <AlertTitle>{props.text}</AlertTitle>
        <AlertDescription>
          <p>{props.description}</p>
          {/* <ul className="list-inside list-disc text-sm">
            <li>Check your card details</li>
            <li>Ensure sufficient funds</li>
            <li>Verify billing address</li>
          </ul> */}
        </AlertDescription>
      </Alert>
    </div>
  );
}
