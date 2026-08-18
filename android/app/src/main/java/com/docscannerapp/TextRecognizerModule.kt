package com.docscannerapp

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.ColorMatrix
import android.graphics.ColorMatrixColorFilter
import android.graphics.Paint
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.TextRecognizer
import com.google.mlkit.vision.text.chinese.ChineseTextRecognizerOptions
import com.google.mlkit.vision.text.devanagari.DevanagariTextRecognizerOptions
import com.google.mlkit.vision.text.japanese.JapaneseTextRecognizerOptions
import com.google.mlkit.vision.text.korean.KoreanTextRecognizerOptions
import com.google.mlkit.vision.text.latin.TextRecognizerOptions

class TextRecognizerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "TextRecognizer"

    // Picks the right ML Kit recognizer for the requested script.
    // "latin" (default) covers English/Roman-script text.
    private fun getRecognizer(language: String?): TextRecognizer {
        return when (language) {
            "chinese" -> TextRecognition.getClient(ChineseTextRecognizerOptions.Builder().build())
            "devanagari" -> TextRecognition.getClient(DevanagariTextRecognizerOptions.Builder().build())
            "japanese" -> TextRecognition.getClient(JapaneseTextRecognizerOptions.Builder().build())
            "korean" -> TextRecognition.getClient(KoreanTextRecognizerOptions.Builder().build())
            else -> TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
        }
    }

    // Grayscale + contrast boost — helps OCR accuracy on low-light or low-contrast scans.
    private fun enhanceBitmap(source: Bitmap): Bitmap {
        val enhanced = Bitmap.createBitmap(source.width, source.height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(enhanced)
        val paint = Paint()

        val contrast = 1.4f
        val brightness = -20f

        val colorMatrix = ColorMatrix()
        colorMatrix.setSaturation(0f) // grayscale
        val contrastMatrix = ColorMatrix(
            floatArrayOf(
                contrast, 0f, 0f, 0f, brightness,
                0f, contrast, 0f, 0f, brightness,
                0f, 0f, contrast, 0f, brightness,
                0f, 0f, 0f, 1f, 0f
            )
        )
        colorMatrix.postConcat(contrastMatrix)
        paint.colorFilter = ColorMatrixColorFilter(colorMatrix)
        canvas.drawBitmap(source, 0f, 0f, paint)
        return enhanced
    }

    @ReactMethod
    fun recognizeText(imagePath: String, language: String?, enhance: Boolean, promise: Promise) {
        try {
            val cleanPath = imagePath.replace("file://", "")
            var bitmap = BitmapFactory.decodeFile(cleanPath)
                ?: throw Exception("Could not read image at $cleanPath")

            if (enhance) {
                bitmap = enhanceBitmap(bitmap)
            }

            val image = InputImage.fromBitmap(bitmap, 0)
            val recognizer = getRecognizer(language)

            recognizer.process(image)
                .addOnSuccessListener { visionText ->
                    val result: WritableMap = Arguments.createMap()
                    result.putString("fullText", visionText.text)

                    val blocks: WritableArray = Arguments.createArray()
                    for (block in visionText.textBlocks) {
                        val blockMap: WritableMap = Arguments.createMap()
                        blockMap.putString("text", block.text)
                        val box = block.boundingBox
                        if (box != null) {
                            val boxMap: WritableMap = Arguments.createMap()
                            boxMap.putInt("left", box.left)
                            boxMap.putInt("top", box.top)
                            boxMap.putInt("right", box.right)
                            boxMap.putInt("bottom", box.bottom)
                            blockMap.putMap("boundingBox", boxMap)
                        }
                        blocks.pushMap(blockMap)
                    }
                    result.putArray("blocks", blocks)

                    promise.resolve(result)
                }
                .addOnFailureListener { e ->
                    promise.reject("OCR_ERROR", e.message, e)
                }
        } catch (e: Exception) {
            promise.reject("OCR_ERROR", e.message, e)
        }
    }
}