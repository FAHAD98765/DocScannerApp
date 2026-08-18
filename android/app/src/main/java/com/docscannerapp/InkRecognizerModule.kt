package com.docscannerapp

import com.facebook.react.bridge.*
import com.google.mlkit.vision.digitalink.*
import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.common.model.RemoteModelManager

class InkRecognizerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "InkRecognizerModule"

    @ReactMethod
    fun recognizeInk(strokesJson: ReadableArray, promise: Promise) {
        try {
            val inkBuilder = Ink.builder()
        for (i in 0 until strokesJson.size()) {
                val strokeArray = strokesJson.getArray(i)!!
                val strokeBuilder = Ink.Stroke.builder()
                for (j in 0 until strokeArray.size()) {
                    val point = strokeArray.getMap(j)!!
                    strokeBuilder.addPoint(
                        Ink.Point.create(
                            point.getDouble("x").toFloat(),
                            point.getDouble("y").toFloat(),
                            point.getDouble("t").toLong()
                        )
                    )
                }
                inkBuilder.addStroke(strokeBuilder.build())
            }
            val ink = inkBuilder.build()

            val modelIdentifier = DigitalInkRecognitionModelIdentifier.fromLanguageTag("en-US")
            if (modelIdentifier == null) {
                promise.reject("MODEL_ERROR", "Language model not found")
                return
            }
            val model = DigitalInkRecognitionModel.builder(modelIdentifier).build()
            RemoteModelManager.getInstance().download(model, DownloadConditions.Builder().build())
                .addOnSuccessListener {
                    val recognizer = DigitalInkRecognition.getClient(
                        DigitalInkRecognizerOptions.builder(model).build()
                    )
                    recognizer.recognize(ink)
                        .addOnSuccessListener { result ->
                            promise.resolve(result.candidates.firstOrNull()?.text ?: "")
                        }
                        .addOnFailureListener { e -> promise.reject("RECOGNITION_ERROR", e.message) }
                }
                .addOnFailureListener { e -> promise.reject("MODEL_DOWNLOAD_ERROR", e.message) }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
}