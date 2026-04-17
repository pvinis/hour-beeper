Pod::Spec.new do |s|
  s.name = 'expo-hour-chime-alarmkit'
  s.version = '1.0.0'
  s.summary = 'Local AlarmKit bridge for Hour Beeper'
  s.description = 'A narrow Expo native module that exposes AlarmKit scheduling and authorization to Hour Beeper.'
  s.author = 'Hour Beeper'
  s.homepage = 'https://docs.expo.dev/modules/'
  s.platforms = {
    :ios => '15.1',
    :tvos => '15.1'
  }
  s.source = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = '**/*.{h,m,mm,swift,hpp,cpp}'
end
