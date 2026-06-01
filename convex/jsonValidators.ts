import { v } from 'convex/values';

export const SettingPrimitiveValidator = v.union(v.string(), v.number(), v.boolean(), v.null());

export const LooseJsonObjectLeafValidator = v.union(
  SettingPrimitiveValidator,
  v.array(SettingPrimitiveValidator),
  v.record(v.string(), SettingPrimitiveValidator)
);

export const LooseJsonValueValidator = v.union(
  SettingPrimitiveValidator,
  v.array(LooseJsonObjectLeafValidator),
  v.record(v.string(), LooseJsonObjectLeafValidator)
);

const LooseJsonLevel1Validator = v.union(
  SettingPrimitiveValidator,
  v.array(SettingPrimitiveValidator),
  v.record(v.string(), SettingPrimitiveValidator)
);

const LooseJsonLevel2Validator = v.union(
  SettingPrimitiveValidator,
  v.array(LooseJsonLevel1Validator),
  v.record(v.string(), LooseJsonLevel1Validator)
);

const LooseJsonLevel3Validator = v.union(
  SettingPrimitiveValidator,
  v.array(LooseJsonLevel2Validator),
  v.record(v.string(), LooseJsonLevel2Validator)
);

const LooseJsonLevel4Validator = v.union(
  SettingPrimitiveValidator,
  v.array(LooseJsonLevel3Validator),
  v.record(v.string(), LooseJsonLevel3Validator)
);

const LooseJsonLevel5Validator = v.union(
  SettingPrimitiveValidator,
  v.array(LooseJsonLevel4Validator),
  v.record(v.string(), LooseJsonLevel4Validator)
);

const LooseJsonLevel6Validator = v.union(
  SettingPrimitiveValidator,
  v.array(LooseJsonLevel5Validator),
  v.record(v.string(), LooseJsonLevel5Validator)
);

const LooseJsonLevel7Validator = v.union(
  SettingPrimitiveValidator,
  v.array(LooseJsonLevel6Validator),
  v.record(v.string(), LooseJsonLevel6Validator)
);

const LooseJsonLevel8Validator = v.union(
  SettingPrimitiveValidator,
  v.array(LooseJsonLevel7Validator),
  v.record(v.string(), LooseJsonLevel7Validator)
);

const LooseJsonLevel9Validator = v.union(
  SettingPrimitiveValidator,
  v.array(LooseJsonLevel8Validator),
  v.record(v.string(), LooseJsonLevel8Validator)
);

export const LooseJsonDeepValueValidator = v.union(
  SettingPrimitiveValidator,
  v.array(LooseJsonLevel9Validator),
  v.record(v.string(), LooseJsonLevel9Validator)
);

export const SettingValueValidator = v.union(
  SettingPrimitiveValidator,
  v.array(v.string()),
  v.record(v.string(), SettingPrimitiveValidator)
);
