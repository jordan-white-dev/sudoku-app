import {
  chakra,
  type HTMLChakraProps,
  Icon,
  RadioCard,
  SimpleGrid,
} from "@chakra-ui/react";
import {
  type Dispatch,
  type PropsWithChildren,
  type KeyboardEvent as ReactKeyboardEvent,
  type SetStateAction,
} from "react";

import { Tooltip } from "@/lib/pages/home/components/tooltip";
import {
  getCellSizeScaledBy,
  MARKUP_COLOR_BLUE,
  MARKUP_COLOR_GRAY,
  MARKUP_COLOR_GREEN,
  MARKUP_COLOR_ORANGE,
  MARKUP_COLOR_PINK,
  MARKUP_COLOR_PURPLE,
  MARKUP_COLOR_RED,
  MARKUP_COLOR_WHITE,
  MARKUP_COLOR_YELLOW,
} from "@/lib/pages/home/utils/constants";
import { type KeypadMode } from "@/lib/pages/home/utils/types";

// #region SVG Definitions

// #region Digit SVG
const DigitSVG = (props: HTMLChakraProps<"svg">) => (
  <chakra.svg
    fill="currentColor"
    focusable="false"
    role="img"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <title>Digit</title>
    <path fill="none" d="M0 0h24v24H0V0z" />
    <path d="M18 19H6c-.55 0-1-.45-1-1V6c0-.55.45-1 1-1h12c.55 0 1 .45 1 1v12c0 .55-.45 1-1 1zm1-16H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
    <path d="M13.99 10.922q0-1.14-.21-1.856t-.578-1.106q-.33-.36-.667-.495t-.743-.135q-.922 0-1.47.66t-.547 1.912q0 .706.18 1.163t.585.787q.285.233.645.312t.772.078q.48 0 1.035-.168t.968-.447l.019-.296q.012-.184.011-.409zm-5.738-.96q0-.862.282-1.574t.768-1.23q.466-.495 1.137-.773t1.361-.277q.772 0 1.399.258t1.084.747q.577.615.896 1.612t.319 2.52q0 1.388-.312 2.629t-.918 2.059q-.645.87-1.55 1.327t-2.23.457q-.3 0-.638-.033t-.63-.124v-1.432h.075q.188.104.585.202t.81.098q1.47 0 2.31-.968t.953-2.768q-.6.405-1.144.593t-1.181.187q-.623 0-1.133-.135t-1.027-.525q-.6-.457-.908-1.158t-.307-1.692z" />
  </chakra.svg>
);
// #endregion

// #region Center SVG
const CenterSVG = (props: HTMLChakraProps<"svg">) => (
  <chakra.svg
    fill="currentColor"
    focusable="false"
    role="img"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <title>Center</title>
    <path d="M18 19H6c-.55 0-1-.45-1-1V6c0-.55.45-1 1-1h12c.55 0 1 .45 1 1v12c0 .55-.45 1-1 1zm1-16H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
    <path d="M11.726 14.5H8.282v-.91h1.1v-2.755h-1.1v-.85q.242 0 .48-.032t.381-.101q.168-.084.261-.226t.107-.351h1.141v4.315h1.075v.91zM15.957 14.5h-3.829v-.85q.487-.386.874-.729t.68-.65q.382-.403.553-.708t.172-.626q0-.364-.217-.558t-.606-.194q-.199 0-.376.048t-.359.126q-.178.081-.304.165l-.189.126h-.102V9.512q.221-.105.69-.215t.903-.11q.927 0 1.405.413t.478 1.162q0 .462-.217.905t-.721.95q-.315.311-.613.555t-.43.345h2.208v.983z" />
  </chakra.svg>
);
// #endregion

// #region Corner SVG
const CornerSVG = (props: HTMLChakraProps<"svg">) => (
  <chakra.svg
    fill="currentColor"
    focusable="false"
    role="img"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <title>Corner</title>
    <path d="M18 19H6c-.55 0-1-.45-1-1V6c0-.55.45-1 1-1h12c.55 0 1 .45 1 1v12c0 .55-.45 1-1 1zm1-16H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
    <path d="M10.326 11.2H6.882v-.91h1.1V7.535h-1.1v-.85q.242 0 .48-.032t.381-.101q.168-.084.261-.226t.107-.352h1.141v4.316h1.074v.91zM17.557 11.2h-3.829v-.85q.487-.386.874-.729t.68-.65q.382-.403.553-.708t.172-.626q0-.364-.217-.558t-.606-.195q-.199 0-.376.05t-.359.125q-.178.081-.304.165l-.189.126h-.102V6.213q.221-.106.69-.216t.903-.11q.927 0 1.405.413t.478 1.162q0 .462-.217.905t-.721.95q-.315.311-.613.555t-.43.345h2.208v.983zM10.428 16.422q0 .381-.142.696t-.414.536q-.277.22-.65.337t-.908.118q-.609 0-1.045-.102t-.709-.228v-1.13h.126q.287.182.674.315t.705.133q.19 0 .412-.033t.373-.146q.119-.087.19-.215t.072-.362q0-.231-.102-.355t-.269-.18q-.168-.06-.403-.067t-.412-.007H7.7v-.917h.207q.238 0 .437-.021t.34-.084q.14-.067.219-.186t.078-.321q0-.158-.073-.258t-.182-.155q-.126-.063-.294-.084t-.287-.021q-.193 0-.392.045t-.389.116q-.147.056-.308.145t-.238.135h-.108v-1.117q.27-.115.726-.222t.933-.107q.465 0 .807.08t.582.235q.266.165.4.418t.132.573q0 .444-.257.778t-.677.433v.049q.185.028.362.094t.345.217q.157.137.26.352t.104.513z" />
  </chakra.svg>
);
// #endregion

// #region Color SVG
const ColorSVG = (props: HTMLChakraProps<"svg">) => (
  <chakra.svg
    focusable="false"
    role="img"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <title>Color</title>
    <g stroke="#0003" strokeWidth={0.3}>
      <path fill={MARKUP_COLOR_WHITE} d="m12 12 3.36-7.2h3.84v3.84L12 12" />
      <path fill={MARKUP_COLOR_PINK} d="m12 12 7.2-3.36v5.29L12 12" />
      <path fill={MARKUP_COLOR_RED} d="m12 12 7.2 1.93v5.27h-2.16L12 12" />
      <path fill={MARKUP_COLOR_ORANGE} d="m12 12 5.04 7.2h-5.67L12 12" />
      <path fill={MARKUP_COLOR_YELLOW} d="m12 12-.63 7.2H4.8L12 12" />
      <path fill={MARKUP_COLOR_GREEN} d="m12 12-7.2 7.2v-6.57L12 12" />
      <path fill={MARKUP_COLOR_BLUE} d="m12 12-7.2.63V6.96L12 12" />
      <path fill={MARKUP_COLOR_PURPLE} d="M12 12 4.8 6.96V4.8h5.27L12 12" />
      <path fill={MARKUP_COLOR_GRAY} d="m12 12-1.93-7.2h5.29L12 12" />
    </g>
    <path d="M18 19H6c-.55 0-1-.45-1-1V6c0-.55.45-1 1-1h12c.55 0 1 .45 1 1v12c0 .55-.45 1-1 1zm1-16H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
  </chakra.svg>
);
// #endregion

// #endregion

// #region Keypad Mode Selector Card
interface KeypadModeSelectorCardProps extends PropsWithChildren {
  iconBoxSize: string;
  keypadMode: KeypadMode;
  tooltipText: string;
}

const KeypadModeSelectorCard = ({
  children,
  iconBoxSize,
  keypadMode,
  tooltipText,
  ...props
}: KeypadModeSelectorCardProps) => (
  <RadioCard.Item
    _checked={{ color: "white" }}
    alignItems="center"
    aria-label={`${keypadMode} keypad mode`}
    justifyItems="center"
    padding="0"
    value={keypadMode}
    {...props}
  >
    <RadioCard.ItemHiddenInput />
    <Tooltip content={tooltipText} positioning={{ placement: "right-start" }}>
      <RadioCard.ItemControl padding="0">
        <Icon boxSize={iconBoxSize} fill="currentColor">
          {children}
        </Icon>
      </RadioCard.ItemControl>
    </Tooltip>
  </RadioCard.Item>
);
// #endregion

const isKeypadMode = (
  candidateKeypadMode: string,
): candidateKeypadMode is KeypadMode =>
  candidateKeypadMode === "Digit" ||
  candidateKeypadMode === "Color" ||
  candidateKeypadMode === "Center" ||
  candidateKeypadMode === "Corner";

// #region Keypad Mode Selector Component
type KeypadModeSelectorProps = {
  isRowLayout: boolean;
  keypadMode: KeypadMode;
  setBaseKeypadMode: Dispatch<SetStateAction<KeypadMode>>;
};

export const KeypadModeSelector = ({
  isRowLayout,
  keypadMode,
  setBaseKeypadMode,
}: KeypadModeSelectorProps) => {
  const iconBoxSize = isRowLayout
    ? getCellSizeScaledBy(1.2)
    : getCellSizeScaledBy(0.755);

  return (
    <RadioCard.Root
      align="center"
      aria-label="Keypad mode selector"
      colorPalette="blue"
      defaultValue="Digit"
      value={keypadMode}
      variant="solid"
      onKeyDownCapture={(event) => {
        const isNumpadArrow = (
          candidateEvent: ReactKeyboardEvent<HTMLDivElement>,
        ) =>
          candidateEvent.location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD &&
          ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
            candidateEvent.key,
          );

        if (isNumpadArrow(event)) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      onValueChange={(event) => {
        const candidateKeypadMode = event.value;

        if (candidateKeypadMode !== null && isKeypadMode(candidateKeypadMode))
          setBaseKeypadMode(candidateKeypadMode);
      }}
    >
      <SimpleGrid
        columns={isRowLayout ? 2 : 1}
        gap={getCellSizeScaledBy(0.12)}
        gridAutoRows={isRowLayout ? getCellSizeScaledBy(1.2) : "1fr"}
        height={isRowLayout ? undefined : getCellSizeScaledBy(3.38)}
        width={
          isRowLayout ? getCellSizeScaledBy(2.52) : getCellSizeScaledBy(0.755)
        }
      >
        <KeypadModeSelectorCard
          iconBoxSize={iconBoxSize}
          keypadMode="Digit"
          tooltipText="Digit keypad mode"
        >
          <DigitSVG />
        </KeypadModeSelectorCard>

        <KeypadModeSelectorCard
          iconBoxSize={iconBoxSize}
          keypadMode="Center"
          tooltipText="Center markup mode"
        >
          <CenterSVG />
        </KeypadModeSelectorCard>

        <KeypadModeSelectorCard
          iconBoxSize={iconBoxSize}
          keypadMode="Corner"
          tooltipText="Corner markup mode"
        >
          <CornerSVG />
        </KeypadModeSelectorCard>

        <KeypadModeSelectorCard
          iconBoxSize={iconBoxSize}
          keypadMode="Color"
          tooltipText="Color markup mode"
        >
          <ColorSVG />
        </KeypadModeSelectorCard>
      </SimpleGrid>
    </RadioCard.Root>
  );
};
// #endregion
