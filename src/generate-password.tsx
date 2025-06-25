import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { Clipboard } from "@raycast/api";
import PasswordService from "./modules/password.service";
import { useEffect, useMemo, useState } from "react";

type GeneratePasswordFormValues = {
  [PasswordOptions.passwordLength]: number;
  [PasswordOptions.useUpperCase]: boolean;
  [PasswordOptions.useLowerCase]: boolean;
  [PasswordOptions.useNumbers]: boolean;
  [PasswordOptions.useSymbols]: boolean;
  [PasswordOptions.allowAmbiguousCharacters]: boolean;
};

const PasswordPresets = {
  AllCharacters: "all_characters",
  ForReading: "for_reading",
  ForSaying: "for_saying",
} as const;
const PasswordOptions = {
  useUpperCase: "useUpperCase",
  useLowerCase: "useLowerCase",
  useNumbers: "useNumbers",
  useSymbols: "useSymbols",
  allowAmbiguousCharacters: "allowAmbiguousCharacters",
  passwordLength: "passwordLength",
} as const;

export type PasswordPresets = (typeof PasswordPresets)[keyof typeof PasswordPresets];
export type PasswordOptions = (typeof PasswordOptions)[keyof typeof PasswordOptions];

export default function Command() {
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [passwordOptions, setPasswordOptions] = useState<GeneratePasswordFormValues>({
    passwordLength: 16,
    useLowerCase: true,
    useNumbers: true,
    useSymbols: true,
    useUpperCase: true,
    allowAmbiguousCharacters: true,
  });
  const [passwordOptionErrors, setPasswordOptionErrors] = useState<Record<PasswordOptions, string | undefined>>({
    passwordLength: undefined,
    useUpperCase: undefined,
    useLowerCase: undefined,
    useNumbers: undefined,
    useSymbols: undefined,
    allowAmbiguousCharacters: undefined,
  });
  const addPasswordOptionError = (option: PasswordOptions, error: string) => {
    setPasswordOptionErrors((oldVal) => {
      return {
        ...oldVal,
        [option]: error,
      };
    });
  };
  const removePasswordOptionError = (option: PasswordOptions) => {
    setPasswordOptionErrors((oldVal) => {
      return {
        ...oldVal,
        [option]: undefined,
      };
    });
  };
  const validateOnBlur = (option: PasswordOptions, value?: string) => {
    switch (option) {
      case PasswordOptions.passwordLength:
        if (!value) {
          addPasswordOptionError(option, "Password length is required");
        }
        const passwordLength = Number(value);
        if (Number.isNaN(passwordLength)) {
          addPasswordOptionError(option, "Password length must be a number");
        }
        if (passwordLength < 4) {
          addPasswordOptionError(option, "Password must be at least 4 symbols");
        }

        if (passwordLength > 256) {
          addPasswordOptionError(option, "Password must be less than 256 symbols");
        }
        break;
      default:
        return;
    }
  };
  const [passwordPreset, setPasswordPreset] = useState<string>(PasswordPresets.AllCharacters);
  useEffect(() => {
    switch (passwordPreset) {
      case PasswordPresets.AllCharacters:
        setPasswordOptions((oldVal) => {
          return {
            ...oldVal,
            useNumbers: true,
            useSymbols: true,
            useLowerCase: true,
            useUpperCase: true,
            allowAmbiguousCharacters: true,
          };
        });
        break;
      case PasswordPresets.ForReading:
        setPasswordOptions((oldVal) => {
          return {
            ...oldVal,
            useNumbers: false,
            useSymbols: false,
            useLowerCase: true,
            useUpperCase: true,
            allowAmbiguousCharacters: false,
          };
        });
        break;
      case PasswordPresets.ForSaying:
        setPasswordOptions((oldVal) => {
          return {
            ...oldVal,
            useNumbers: false,
            useSymbols: false,
            useLowerCase: true,
            useUpperCase: true,
            allowAmbiguousCharacters: true,
          };
        });
    }
  }, [passwordPreset]);

  const handlePasswordOptionChange = (value: boolean | string, option: PasswordOptions) => {
    let newValue: boolean | number | string = value;
    if (option === PasswordOptions.passwordLength) {
      newValue = Number(value);
    }
    removePasswordOptionError(option);
    setPasswordOptions((oldVal) => {
      return {
        ...oldVal,
        [option]: value,
      };
    });
  };

  const onSubmit = async (values: GeneratePasswordFormValues) => {
    const password = PasswordService.generatePassword({
      passwordLength: Number(values.passwordLength),
      useNumbers: true,
      useSymbols: true,
      useLowerCase: true,
      useUpperCase: true,
      allowAmbiguousCharacters: false,
    });
    await Clipboard.copy(password);
    showToast({
      style: Toast.Style.Success,
      title: "Password copied to clipboard!",
      message: `${password}`,
    });
  };

  const entropyBits = useMemo(() => {
    return PasswordService.countEntropyBits(passwordOptions);
  }, [passwordOptions]);
  const passwordStrength = useMemo(() => {
    if (entropyBits < 8) {
      return "Very weak";
    }
    if (entropyBits < 16) {
      return "Weak";
    }
    if (entropyBits < 32) {
      return "Average";
    }
    if (entropyBits < 64) {
      return "Strong";
    }
    return "Very strong";
  }, [entropyBits]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Choose preferred password options." />
      <Form.TextField
        id="passwordLength"
        title="Length"
        placeholder="Enter text"
        value={passwordOptions.passwordLength.toString()}
        onChange={(value) => handlePasswordOptionChange(value, PasswordOptions.passwordLength)}
        onBlur={(value) => validateOnBlur(PasswordOptions.passwordLength, value.target.value)}
        error={passwordOptionErrors.passwordLength}
      />
      <Form.Dropdown
        id="dropdown"
        title="Favorite Language"
        value={passwordPreset}
        onChange={setPasswordPreset}
        info={`Password presets define the symbols used in password.
All characters - all characters are used
For reading - avoid ambiguous characters and special symbols
For saying - avoid numbers and special symbols`}
      >
        <Form.Dropdown.Item value={PasswordPresets.AllCharacters} title="All Characters" icon="🔍" />
        <Form.Dropdown.Item value={PasswordPresets.ForReading} title="For Reading" icon="📙" />
        <Form.Dropdown.Item value={PasswordPresets.ForSaying} title="For Saying" icon="💬" />
      </Form.Dropdown>
      <Form.Description text={`${passwordStrength}`} title="Password strength" />
      <Form.Separator />
      <Form.Checkbox
        id="showAdvancedOptions"
        title="Show advanced options"
        label=""
        value={showAdvancedOptions}
        onChange={(value) => setShowAdvancedOptions(value)}
      />
      {showAdvancedOptions ? (
        <>
          <Form.Checkbox
            id={PasswordOptions.useUpperCase}
            title="Uppercase letters"
            label="ABC"
            value={passwordOptions.useUpperCase}
            onChange={(value) => handlePasswordOptionChange(value, PasswordOptions.useUpperCase)}
          />
          <Form.Checkbox
            id={PasswordOptions.useLowerCase}
            title="Lowercase letters"
            label="abc"
            value={passwordOptions.useLowerCase}
            onChange={(value) => handlePasswordOptionChange(value, PasswordOptions.useLowerCase)}
          />
          <Form.Checkbox
            id={PasswordOptions.useNumbers}
            title="Numbers"
            label="123"
            value={passwordOptions.useNumbers}
            onChange={(value) => handlePasswordOptionChange(value, PasswordOptions.useNumbers)}
          />
          <Form.Checkbox
            id={PasswordOptions.useSymbols}
            title="Special symbols"
            label="@^$"
            value={passwordOptions.useSymbols}
            onChange={(value) => handlePasswordOptionChange(value, PasswordOptions.useSymbols)}
          />
          <Form.Checkbox
            id={PasswordOptions.allowAmbiguousCharacters}
            title="Allow Ambiguous Characters"
            label="Ii10O"
            value={passwordOptions.allowAmbiguousCharacters}
            onChange={(value) => handlePasswordOptionChange(value, PasswordOptions.allowAmbiguousCharacters)}
          />
          <Form.Description text={`Entropy bits: ${entropyBits.toFixed(2)}`} />
        </>
      ) : null}
    </Form>
  );
}
